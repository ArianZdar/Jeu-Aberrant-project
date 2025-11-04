// Les Behavior private/protected doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { MOVEMENT_DELAY_MS, TURN_TIMER } from '@app/constants/client-constants';
import { Player } from '@common/player/player';
import { Coordinate, Tile, TileMaterial } from '@common/game/game-info';
import { BehaviorSubject, Observable } from 'rxjs';
@Injectable({
    providedIn: 'root',
})
export class PlayerService {
    isCurrentPlayerTurn = false;
    private readonly playersSubject = new BehaviorSubject<Player[]>([]);
    players$ = this.playersSubject.asObservable();
    private currentClientPlayerId: string | null;
    private readonly animationsInProgress = new Map<string, ReturnType<typeof setInterval>>();
    private readonly mainPlayerStats$ = new BehaviorSubject<Player>({} as Player);
    private readonly currentTurnPlayerId$ = new BehaviorSubject<string | null>(null);
    private readonly fightWinsMap$ = new BehaviorSubject<Map<string, number>>(new Map<string, number>());
    private readonly turnTimer$ = new BehaviorSubject<number>(0);

    get players(): Player[] {
        return this.playersSubject.value;
    }

    setPlayers(players: Player[]): void {
        this.playersSubject.next(players);

        if (this.currentClientPlayerId) {
            const currentPlayer = this.players.find((player) => player._id === this.currentClientPlayerId);
            if (currentPlayer) {
                this.mainPlayerStats$.next(currentPlayer);
            }
        }
    }

    updatePlayer(newPlayers: Player[]): void {
        const currentPlayers = this.playersSubject.value;

        const newPlayersMap = new Map<string, Player>();
        newPlayers.forEach((player) => {
            newPlayersMap.set(player._id, { ...player, isConnected: true });
        });

        const updatedPlayers: Player[] = [];

        newPlayers.forEach((player) => {
            updatedPlayers.push({ ...player, isConnected: true });
        });

        currentPlayers.forEach((player) => {
            if (!newPlayersMap.has(player._id)) {
                updatedPlayers.push({
                    ...player,
                    isConnected: false,
                });
            }
        });

        this.playersSubject.next(updatedPlayers);

        if (this.currentClientPlayerId) {
            const currentPlayer = updatedPlayers.find((player) => player._id === this.currentClientPlayerId);
            if (currentPlayer) {
                this.mainPlayerStats$.next(currentPlayer);
            }
        }
    }

    async animatePlayerMovement(playerId: string, path: Coordinate[], finalPlayers: Player[]): Promise<void> {
        if (this.animationsInProgress.has(playerId)) {
            clearInterval(this.animationsInProgress.get(playerId));
        }

        if (!path || path.length <= 1) {
            const connectedPlayers = finalPlayers.filter((player) => player.isConnected);
            this.updatePlayer(connectedPlayers);
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            let stepIndex = 0;

            const intervalId = setInterval(() => {
                stepIndex++;

                if (stepIndex >= path.length) {
                    clearInterval(intervalId);
                    this.animationsInProgress.delete(playerId);

                    const connectedPlayers = finalPlayers.filter((player) => player.isConnected);
                    this.updatePlayer(connectedPlayers);

                    resolve();
                    return;
                }

                const updatedPlayers = [...this.players].filter((player) => player.isConnected);
                const playerToUpdate = updatedPlayers.find((p) => p._id === playerId);

                if (playerToUpdate) {
                    playerToUpdate.position = path[stepIndex];
                    this.updatePlayer(updatedPlayers);
                }
            }, MOVEMENT_DELAY_MS);

            this.animationsInProgress.set(playerId, intervalId);
        });
    }

    setMainPlayerId(id: string | null) {
        this.currentClientPlayerId = id;
    }

    getMainPlayerId(): string | null {
        return this.currentClientPlayerId;
    }

    getMainPlayerStats(): Observable<Player> {
        return this.mainPlayerStats$.asObservable();
    }

    getMainPlayer(): Player | undefined {
        return !this.currentClientPlayerId ? undefined : this.players.find((player) => player._id === this.currentClientPlayerId);
    }

    getPlayers(): Player[] {
        return this.players;
    }

    getPlayerAtPosition(x: number, y: number): Player | undefined {
        const player = this.players.find((targetPlayer) => targetPlayer.position.x === x && targetPlayer.position.y === y);
        return player?.isConnected ? player : undefined;
    }

    getPlayerById(playerId: string): Player | undefined {
        return !playerId ? undefined : this.players.find((player) => player._id === playerId);
    }

    setCurrentTurnPlayerId(playerId: string): void {
        const player = this.players.find((p) => p._id === playerId);

        if (player && !player.isConnected) {
            const currentIndex = this.players.findIndex((p) => p._id === playerId);
            let nextPlayerIndex = (currentIndex + 1) % this.players.length;

            while (nextPlayerIndex !== currentIndex) {
                const nextPlayer = this.players[nextPlayerIndex];
                if (nextPlayer.isConnected) {
                    playerId = nextPlayer._id;
                    break;
                }
                nextPlayerIndex = (nextPlayerIndex + 1) % this.players.length;
            }
        }

        this.currentTurnPlayerId$.next(playerId);
        this.resetTurnTimer();
    }

    isMainPlayerAdjacent(coordinate: Coordinate) {
        const x = coordinate.x;
        const y = coordinate.y;
        const player = this.getMainPlayer();
        if (!player) {
            return;
        }
        const playerX = player.position.x;
        const playerY = player.position.y;
        const isAdjacent =
            (x === playerX && y === playerY - 1) ||
            (x === playerX && y === playerY + 1) ||
            (x === playerX - 1 && y === playerY) ||
            (x === playerX + 1 && y === playerY);

        return isAdjacent;
    }

    continueTurn(tiles: Tile[][], gridSize: number): boolean {
        const player = this.getMainPlayer();
        if (!player) return false;
        if (!this.isCurrentPlayerTurn) {
            return true;
        }
        if (player.speed > 0) {
            return true;
        }
        const px = player.position.x;
        const py = player.position.y;
        const adjacentTiles = [
            { x: px, y: py - 1 },
            { x: px + 1, y: py },
            { x: px, y: py + 1 },
            { x: px - 1, y: py },
        ];
        for (const tile of adjacentTiles) {
            if (tile.x < 0 || tile.x >= gridSize || tile.y < 0 || tile.y >= gridSize) {
                continue;
            }
            const tileInfo = tiles[tile.y][tile.x];
            if (this.checkForPossibleActions(player, tileInfo, tile)) {
                return true;
            }
            if (tileInfo?.material?.includes(TileMaterial.Ice)) {
                return true;
            }
        }
        return false;
    }

    getCurrentTurnPlayerId(): Observable<string | null> {
        return this.currentTurnPlayerId$.asObservable();
    }

    getCurrentTurnPlayerIdValue(): string | null {
        return this.currentTurnPlayerId$.getValue();
    }

    updatePlayerFightWins(playerId: string, wins: number): void {
        const currentMap = this.fightWinsMap$.value;
        currentMap.set(playerId, wins);
        this.fightWinsMap$.next(new Map(currentMap));
    }

    getPlayerFightWins(playerId: string): Observable<number> {
        return new Observable<number>((observer) => {
            this.fightWinsMap$.subscribe((currentMap) => {
                observer.next(currentMap.get(playerId) ?? 0);
            });
        });
    }

    updateTurnTimer(seconds: number): void {
        this.turnTimer$.next(seconds);
    }

    resetTurnTimer(): void {
        this.turnTimer$.next(TURN_TIMER);
    }

    getTurnTimer(): Observable<number> {
        return this.turnTimer$.asObservable();
    }

    reset(): void {
        this.animationsInProgress.forEach((intervalId) => {
            clearInterval(intervalId);
        });
        this.animationsInProgress.clear();
        this.playersSubject.next([]);
        this.currentClientPlayerId = null;
        this.isCurrentPlayerTurn = false;
        this.mainPlayerStats$.next({} as Player);
        this.currentTurnPlayerId$.next(null);
        this.fightWinsMap$.next(new Map<string, number>());
        this.turnTimer$.next(0);
    }

    private checkForPossibleActions(player: Player, tile: Tile, tileCoordinate: Coordinate): boolean {
        if (player.actionPoints > 0 && tile) {
            const adjacentPlayer = this.getPlayerAtPosition(tileCoordinate.x, tileCoordinate.y);
            if (adjacentPlayer?.isConnected) {
                return true;
            }

            if (tile.material.includes(TileMaterial.Door)) {
                return true;
            }
        }
        return false;
    }
}
