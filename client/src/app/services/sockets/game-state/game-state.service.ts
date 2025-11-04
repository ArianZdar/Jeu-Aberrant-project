// Les Behavior private/protected doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { inject, Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TurnNotificationComponent } from '@app/components/game-page-components/turn-notification/turn-notification.component';
import { TRANSITION_DELAY_IN_MS, MS_OF_ONE_AND_HALF_SECOND } from '@app/constants/client-constants';
import { PlayerService } from '@app/services/player/player.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { GameConfig } from '@common/game/game-config';
import { Coordinate } from '@common/game/game-info';
import { CommonGatewayEvents, GameGatewayEvents, ActionJournalEvents } from '@common/events/gateway-events';
import { GameItem } from '@common/grid/grid-state';
import { ChatMessage } from '@common/game/message';
import { Player } from '@common/player/player';
import { MovementData, PlayerMovementInfo } from '@common/player/player-movement-info';
import { ShortestPath } from '@common/grid/shortest-path';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { PlayerAttackInterface, TurnInterface, GetShortestPathToTileInterface, RebindSocketIdInterface } from '@common/events/data-interface';
@Injectable({
    providedIn: 'root',
})
export class GameStateService {
    playersUpdatedSubject = new Subject<Player[]>();
    playersUpdated$ = this.playersUpdatedSubject.asObservable();
    combatTimerSubject = new BehaviorSubject<number>(0);
    combatTimer$ = this.combatTimerSubject.asObservable();
    private combatDataSubject = new BehaviorSubject<{ attackerId: string; targetId: string } | null>(null);
    combatData$ = this.combatDataSubject.asObservable();
    private turnTimerPausedSubject = new BehaviorSubject<boolean>(false);
    private turnTimerPaused$ = this.turnTimerPausedSubject.asObservable();
    private isDebugActiveSubject = new BehaviorSubject<boolean>(false);
    isDebugActive$ = this.isDebugActiveSubject.asObservable();

    private socket: Socket;
    private currentGameId: string;
    private mainPlayerStats$ = new BehaviorSubject<Player>({} as Player);
    private lobbyService = inject(LobbyService);

    constructor(
        private readonly playerService: PlayerService,
        private dialog: MatDialog,
    ) {
        this.connect();
    }

    async createGame(data: GameConfig): Promise<string> {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.CreateGame, data, (response: { success: boolean; gameId?: string }) => {
                if (response.success && response.gameId) {
                    this.setCurrentGameId(response.gameId);
                    resolve(response.gameId);
                }
            });
        });
    }

    async forfeitCombat(targetId: string): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.AttemptEscape, targetId, (response: { canEscape: boolean }) => {
                resolve(response.canEscape);
            });
        });
    }

    startTurn(gameId: string, playerId: string): void {
        const data: TurnInterface = { gameId, playerId };
        this.socket.emit(GameGatewayEvents.TurnStart, data);
    }

    endTurn(gameId: string, playerId: string): void {
        const data: TurnInterface = { gameId, playerId };
        this.socket.emit(GameGatewayEvents.EndTurn, data);
    }

    pickupItem(itemPosition: Coordinate) {
        this.socket.emit(GameGatewayEvents.PickupItem, itemPosition);
    }

    dropItem(gameItem: GameItem) {
        this.socket.emit(GameGatewayEvents.DropItem, gameItem);
    }

    async joinGame(gameId: string): Promise<void> {
        this.socket.emit(GameGatewayEvents.JoinGame, gameId);
        this.setupSocketListeners();
    }

    async getPlayers(): Promise<Player[]> {
        this.playerService.setMainPlayerId(this.getSocketId());
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.GetPlayers, (players: Player[]) => {
                resolve(players);
            });
        });
    }

    async getMapId(): Promise<string> {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.GetMapId, (mapId: string) => {
                resolve(mapId);
            });
        });
    }

    async getAccessibleTiles(): Promise<Coordinate[]> {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.GetAccessibleTiles, (tiles: Coordinate[]) => {
                resolve(tiles);
            });
        });
    }

    async movePlayer(data: PlayerMovementInfo) {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.MovePlayer, data, (response: MovementData) => {
                resolve(response);
            });
        });
    }

    async getShortestPathToTile(gameId: string, playerId: string, destination: Coordinate): Promise<ShortestPath> {
        return new Promise((resolve) => {
            const data: GetShortestPathToTileInterface = { gameId, playerId, destination };
            this.socket.emit(GameGatewayEvents.GetShortestPathToTile, data, (path: ShortestPath) => {
                resolve(path);
            });
        });
    }

    async getItems(): Promise<Set<GameItem>> {
        return new Promise((resolve) => {
            this.socket.emit(GameGatewayEvents.GetItems, (items: GameItem[]) => {
                resolve(new Set(items));
            });
        });
    }

    async startCombat(targetId: string): Promise<void> {
        this.socket.emit(GameGatewayEvents.StartCombat, targetId);
    }

    async opponentDisconnected(): Promise<void> {
        this.socket.emit(GameGatewayEvents.OpponentDisconnected);
    }

    async attack(isAnAutoAttack: boolean, targetId: string): Promise<void> {
        const data: PlayerAttackInterface = { isAnAutoAttack, targetId };
        this.socket.emit(GameGatewayEvents.PlayerAttack, data);
    }

    async useDoor(targetDoor: Coordinate): Promise<void> {
        this.socket.emit(GameGatewayEvents.UseDoor, targetDoor);
    }

    async breakWall(targetWall: Coordinate): Promise<void> {
        this.socket.emit(GameGatewayEvents.BreakWall, targetWall);
    }

    async makePlayerLoseCombat(): Promise<void> {
        this.socket.emit(GameGatewayEvents.MakePlayerLoseCombat);
    }

    firstPlayerTurn(): void {
        setTimeout(() => {
            if (this.playerService.getMainPlayer()?.isLeader) {
                this.socket.emit(ActionJournalEvents.InitialTurn);
            }
        }, MS_OF_ONE_AND_HALF_SECOND);
    }

    leaveGame(): void {
        this.socket.emit(GameGatewayEvents.LeaveGame);
    }

    endCombat(gameId: string): void {
        this.socket.emit(GameGatewayEvents.EndCombat, gameId);
    }

    pauseTurnTimer(gameId: string): void {
        this.socket.emit(GameGatewayEvents.PauseTurnTimer, gameId);
    }

    resumeTurnTimer(gameId: string): void {
        this.socket.emit(GameGatewayEvents.ResumeTurnTimer, gameId);
    }

    getCombatTimer(): Observable<number> {
        return this.combatTimer$;
    }

    getTurnTimerPaused(): Observable<boolean> {
        return this.turnTimerPaused$;
    }

    sendMessage(message: ChatMessage): void {
        this.socket.emit(CommonGatewayEvents.RoomMessage, message);
    }

    sendChatHistoryRequest(lobbyId: string): void {
        this.socket.emit(CommonGatewayEvents.ChatHistory, lobbyId);
    }

    rebindSocketId(): void {
        if (this.getSocketId()) {
            const data: RebindSocketIdInterface = {
                lobbySocketId: this.lobbyService.getSocketId(),
                gameSocketId: this.getSocketId(),
            };
            this.socket.emit(GameGatewayEvents.RebindSocketId, data);
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
        }
    }

    isSocketAlive(): boolean {
        return this.socket?.connected || false;
    }

    getSocket(): Socket {
        return this.socket ?? null;
    }

    getSocketId(): string {
        return this.socket?.id || '';
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    off<Ev extends string>(event: Ev): Socket {
        return this.socket.off(event);
    }

    connect(): void {
        const lobbySocketId = this.lobbyService.getSocketId();
        this.socket = io(`${environment.socketUrl}/game`, {
            transports: ['websocket'],
            upgrade: false,
            auth: {
                lobbySocketId,
            },
        });
    }

    getPlayerStats(): Observable<Player> {
        return this.mainPlayerStats$.asObservable();
    }

    getCurrentGameId(): string {
        return this.currentGameId;
    }

    setCurrentGameId(gameId: string): void {
        this.currentGameId = gameId;
    }

    nextTurn(gameId: string): void {
        this.socket.emit(GameGatewayEvents.NextTurn, gameId);
    }

    activateDebugMode() {
        if (this.playerService.getMainPlayer()?.isLeader) this.socket.emit(GameGatewayEvents.ToggleDebug);
    }

    setIsDebugActive(isActive: boolean): void {
        this.isDebugActiveSubject.next(isActive);
    }

    reset(): void {
        this.currentGameId = '';
        this.combatDataSubject.next(null);
        this.playersUpdatedSubject.next([]);
        this.mainPlayerStats$.next({} as Player);
        this.combatTimerSubject.next(0);
        this.turnTimerPausedSubject.next(false);
        this.isDebugActiveSubject.next(false);

        if (this.socket) {
            this.socket.off(GameGatewayEvents.TurnTransition);
            this.socket.off(GameGatewayEvents.CombatStarted);
            this.socket.off(GameGatewayEvents.TurnTimerPaused);
            this.socket.off(GameGatewayEvents.CombatTimerStart);
            this.socket.off(GameGatewayEvents.CombatTimerTick);
            this.socket.off(GameGatewayEvents.CombatTimerEnd);
        }
    }

    private setupSocketListeners(): void {
        this.socket.on(GameGatewayEvents.TurnTimerPaused, (isPaused: boolean) => {
            this.turnTimerPausedSubject.next(isPaused);
        });

        this.socket.on(GameGatewayEvents.CombatTimerStart, (seconds: number) => {
            this.combatTimerSubject.next(seconds);
        });

        this.socket.on(GameGatewayEvents.CombatTimerTick, (seconds: number) => {
            this.combatTimerSubject.next(seconds);
        });

        this.socket.on(GameGatewayEvents.CombatTimerEnd, () => {
            this.combatTimerSubject.next(0);
        });

        this.socket.on(GameGatewayEvents.TurnStart, (playerId: string) => {
            const players = this.playerService.players;
            const player = players.find((p) => p._id === playerId);
            if (player?.isBot) {
                const data: TurnInterface = { gameId: this.getCurrentGameId(), playerId };
                this.socket.emit(GameGatewayEvents.BotTurn, data);
            }
        });

        this.socket.on(GameGatewayEvents.TurnTransition, (playerId) => {
            const players = this.playerService.players;
            const player = players.find((p) => p._id === playerId);
            if (player) {
                const dialogRef = this.dialog.open(TurnNotificationComponent, {
                    data: { playerName: player.name },
                    width: '30vh',
                    disableClose: false,
                });

                setTimeout(() => {
                    if (dialogRef && dialogRef.componentInstance) {
                        dialogRef.close();
                    }
                }, TRANSITION_DELAY_IN_MS);
            }
        });

        this.socket.on(
            GameGatewayEvents.CombatStarted,
            (data: { attackerId: string; targetId: string; isAttackerDebuffed?: boolean; isTargetDebuffed?: boolean }) => {
                this.combatDataSubject.next(data);
            },
        );

        this.socket.on(GameGatewayEvents.BotStartCombat, (data) => {
            this.socket.emit(GameGatewayEvents.BotStartCombat, data);
        });
    }
}
