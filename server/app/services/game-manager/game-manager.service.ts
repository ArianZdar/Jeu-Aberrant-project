import { MS_OF_ONE_SECOND, TRAVEL_DELAY } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameLogicService } from '@app/services/game-logic/game-logic.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameConfig } from '@common/game/game-config';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { ShortestPath } from '@common/grid/shortest-path';
import { Player } from '@common/player/player';
import { MovementData, PlayerMovementInfo } from '@common/player/player-movement-info';
import { Inject, Injectable } from '@nestjs/common';
@Injectable()
export class GameManagerService {
    @Inject() private readonly chatService: ChatService;

    private _games: Map<string, Game> = new Map();

    constructor(
        private readonly gameInfoService: GameInfoService,
        private readonly gameLogicService: GameLogicService,
        private readonly combatLogicService: CombatLogicService,
        private readonly turnLogicService: TurnLogicService,
        private readonly combatTurnLogicService: CombatTurnLogicService,
    ) {
        this.combatLogicService.setGames(this._games);
    }

    async createGame(gameConfig: GameConfig): Promise<Game> {
        const fetchedGame = await this.gameInfoService.find(gameConfig.mapId);

        if (!fetchedGame) return;

        const game = new Game({
            id: gameConfig.id,
            mapId: gameConfig.mapId,
            gameMode: fetchedGame.gameMode as GameModes,
            grid: fetchedGame.gameGrid,
            players: gameConfig.players,
            gameItems: fetchedGame.items,
        });

        if (this._games.has(game.id)) return;

        this._games.set(game.id, game);
        this.combatLogicService.setGames(this._games);

        return game;
    }

    getGame(gameId: string) {
        return this._games.get(gameId);
    }

    getPlayers(gameId: string): Player[] {
        const game = this._games.get(gameId);

        if (!game) return [];

        return game.players;
    }

    getPlayerDebuffs(attackerId: string, targetId: string): { isAttackerDebuffed: boolean; isTargetDebuffed: boolean } {
        const game = this.findGameByPlayerId(attackerId);
        if (!game) return { isAttackerDebuffed: false, isTargetDebuffed: false };

        const attacker = game.players.find((player) => player._id === attackerId);
        const target = game.players.find((player) => player._id === targetId);

        if (!attacker || !target) return { isAttackerDebuffed: false, isTargetDebuffed: false };

        return this.applyIceDebuffs(attacker, target, game);
    }

    pickupItem(game: Game, playerId: string, itemPosition: Coordinate): boolean {
        return this.gameLogicService.pickupItem(game, playerId, itemPosition);
    }

    findGameByPlayerId(playerId: string) {
        for (const game of this._games.values()) {
            if (game.players.some((player) => player._id === playerId)) {
                return game;
            }
        }
        return undefined;
    }

    updatePlayerConnectionStatus(playerId: string, isConnected: boolean): void {
        const game = this.findGameByPlayerId(playerId);
        if (!game) return;

        const gameId = game.id;
        const players = this.getPlayers(gameId);

        const playerIndex = players.findIndex((p) => p._id === playerId);
        if (playerIndex >= 0) {
            players[playerIndex].isConnected = isConnected;
        }

        const currentPlayers = [...players];
        this.turnLogicService.updatePlayers(gameId, currentPlayers);
    }

    removePlayer(playerId: string): void {
        let playerGame: Game | undefined;
        let playerGameId: string | undefined;
        for (const [gameId, game] of this._games) {
            if (game.players.some((player) => player._id === playerId)) {
                playerGame = game;
                playerGameId = gameId;
                break;
            }
        }

        if (!playerGame || !playerGameId) {
            return;
        }

        const removedPlayer = playerGame.removePlayer(playerId);

        if (removedPlayer) {
            const allRemainingPlayersAreBots = playerGame.players.every((player) => player.isBot);
            if (allRemainingPlayersAreBots || playerGame.players.length === 0) {
                if (this.combatTurnLogicService.isCombatActive(playerGameId)) {
                    this.combatTurnLogicService.endCombat(playerGameId);
                }
                this.turnLogicService.cleanupGame(playerGameId);
                this._games.delete(playerGameId);
                this.combatLogicService.setGames(this._games);
            }
        }
    }

    getAccessibleTileForPlayer(gameId: string, playerId: string): Coordinate[] {
        const targetGame = this._games.get(gameId);

        return !targetGame ? [] : this.gameLogicService.getAccessibleTiles(targetGame, playerId);
    }

    movePlayer(playerMovementInfo: PlayerMovementInfo): MovementData {
        const game = this.getGame(playerMovementInfo.gameId);
        if (!game) return;

        const player = game.players.find((playerToFilter) => playerToFilter._id === playerMovementInfo.movingPlayerId);
        if (!player) return;
        if (!player.isTurn) return;

        const shortestPath = this.getShortestPathToTile(playerMovementInfo.gameId, player._id, playerMovementInfo.targetPosition);

        const isTeleportMovement = game.isDebugModeActive && playerMovementInfo.isTeleporting;
        const isItemAtTargetPosition =
            shortestPath.firstItemOnPath?.position.x === playerMovementInfo.targetPosition.x &&
            shortestPath.firstItemOnPath?.position.y === playerMovementInfo.targetPosition.y;

        if (isTeleportMovement)
            return !isItemAtTargetPosition
                ? {
                      players: this.teleportPlayer(game, playerMovementInfo),
                      playerId: playerMovementInfo.movingPlayerId,
                      path: [],
                      isEndingOnItem: false,
                  }
                : undefined;

        if (!shortestPath.path || shortestPath.path.length === 0) return;

        const winningSpawnPointOnPath = this.gameLogicService.isWinningSpawnPointOnPath(game, shortestPath.path, player);

        let newTargetPosition: Coordinate;

        if (winningSpawnPointOnPath.winning) {
            shortestPath.path = winningSpawnPointOnPath.winningPath;

            if (shortestPath.firstItemOnPath) {
                newTargetPosition = shortestPath.firstItemOnPath.position;
            } else {
                newTargetPosition = player.spawnPointPosition;

                setTimeout(
                    () => {
                        this.turnLogicService.endTurn(game.id, player._id);
                    },
                    TRAVEL_DELAY * shortestPath.path.length + MS_OF_ONE_SECOND,
                );
            }
        } else {
            newTargetPosition = shortestPath.firstItemOnPath ? shortestPath.firstItemOnPath.position : playerMovementInfo.targetPosition;
        }

        const trimmedPath = this.gameLogicService.trimPathToItem(shortestPath);

        const movementData: MovementData = {
            players: game.movePlayer(playerMovementInfo.movingPlayerId, newTargetPosition, trimmedPath),
            playerId: playerMovementInfo.movingPlayerId,
            path: trimmedPath,
            isEndingOnItem: !!shortestPath.firstItemOnPath,
        };

        return movementData;
    }

    teleportPlayer(game: Game, playerMovementInfo: PlayerMovementInfo): Player[] {
        const targetTile = game.gridState.grid[playerMovementInfo.targetPosition.x][playerMovementInfo.targetPosition.y];

        const isTeleportPossible =
            targetTile.isTraversable &&
            !game.isTileOccupied(playerMovementInfo.targetPosition) &&
            (!targetTile.spawnpoint || targetTile.spawnpoint === GameObjects.Spawnpoint);

        if (isTeleportPossible) return game.teleportPlayer(playerMovementInfo.movingPlayerId, playerMovementInfo.targetPosition);
    }

    getShortestPathToTile(gameId: string, playerId: string, destination: Coordinate): ShortestPath {
        const targetGame = this._games.get(gameId);
        if (!targetGame) {
            return { path: [], firstItemOnPath: undefined };
        }

        const player = targetGame.players.find((p) => p._id === playerId);

        if (!player) {
            return { path: [], firstItemOnPath: undefined };
        }

        const playerPosition = player.position;

        const path = this.gameLogicService.getShortestPath(targetGame, playerPosition, destination);
        const firstItemOnPath = this.gameLogicService.findFirstItemOnPath(targetGame, path);

        return { path, firstItemOnPath };
    }

    getShortestPathToTileForBots(gameId: string, playerId: string, destination: Coordinate): Coordinate[] {
        const targetGame = this._games.get(gameId);
        if (!targetGame) {
            return [];
        }

        const player = targetGame.players.find((p) => p._id === playerId);

        if (!player) {
            return [];
        }

        const playerPosition = player.position;
        return this.gameLogicService.getPathWithClosedDoors(targetGame, playerPosition, destination);
    }

    isDoorOpen(gameId: string, doorPosition: Coordinate): boolean {
        const game = this.getGame(gameId);
        if (!game) return false;
        const doorTile = game.gridState.grid[doorPosition.x][doorPosition.y];
        return doorTile?.isDoor && doorTile?.isTraversable;
    }

    toggleDoorState(gameId: string, playerId: string, doorPosition: Coordinate): boolean {
        const isDoorOpen = this.isDoorOpen(gameId, doorPosition);
        const game = this._games.get(gameId);
        if (!game) {
            return false;
        }
        const player = game.players.find((p) => p._id === playerId);
        if (!player?.isTurn) {
            return false;
        }

        if (player.actionPoints <= 0) {
            return false;
        }

        const { x, y } = doorPosition;
        const gridState = game.gridState;

        const isValidDoorPosition =
            gridState?.grid && x >= 0 && x < gridState.grid.length && y >= 0 && y < gridState.grid[0].length && gridState.grid[x][y].isDoor;

        if (!isValidDoorPosition) {
            return false;
        }

        gridState.grid[x][y].isTraversable = !gridState.grid[x][y].isTraversable;
        gridState.grid[x][y].tileCost = gridState.grid[x][y].isTraversable ? 1 : Infinity;

        player.actionPoints--;

        this.chatService.doorEvent(game.id, player, isDoorOpen);

        return true;
    }

    breakWall(gameId: string, playerId: string, wallPosition: Coordinate): boolean {
        const game = this._games.get(gameId);
        if (!game) {
            return false;
        }
        const player = game.players.find((p) => p._id === playerId);
        if (!player?.isTurn) {
            return false;
        }
        if (player.actionPoints <= 0 || !player.items.some((item) => item.item === GameObjects.Pickaxe)) {
            return false;
        }
        const { x, y } = wallPosition;
        const gridState = game.gridState;
        const isValidWallPosition =
            gridState?.grid &&
            x >= 0 &&
            x < gridState.grid.length &&
            y >= 0 &&
            y < gridState.grid[0].length &&
            (gridState.grid[x][y].isDoor || !gridState.grid[x][y].isTraversable);
        if (!isValidWallPosition) {
            return false;
        }
        gridState.grid[x][y].isTraversable = true;
        gridState.grid[x][y].tileCost = 1;
        gridState.grid[x][y].isDoor = false;
        player.actionPoints--;
        return true;
    }

    async playerIsAttacking(playerId: string, targetId: string, isAnAutoAttack: boolean): Promise<void> {
        const game = this.findGameByPlayerId(playerId);
        if (!game) return;
        this.combatLogicService.playerAttackLogic(game, playerId, targetId, isAnAutoAttack);
    }

    opponentDisconnectedInCombat(winnerId: string) {
        const game = this.findGameByPlayerId(winnerId);
        const playersInCombat = this.turnLogicService.getPlayers(game.id);
        const winner = playersInCombat.find((player) => player._id === winnerId);
        this.combatLogicService.resetPlayerHealth(winner);
        this.combatLogicService.playerWonACombat(winner);
    }

    private isPlayerOnIce(player: Player): boolean {
        const game = this.findGameByPlayerId(player._id);

        if (!game) {
            return false;
        }

        const tile = game.gridState.grid[player.position.x][player.position.y];
        if (tile.tileCost === 0) {
            return true;
        }

        return false;
    }

    private applyIceDebuffs(attacker: Player, target: Player, game: Game) {
        const isAttackerDebuffed = this.isPlayerOnIce(attacker) && !game.isDebugModeActive;
        const isTargetDebuffed = this.isPlayerOnIce(target) && !game.isDebugModeActive;

        return {
            isAttackerDebuffed,
            isTargetDebuffed,
        };
    }
}
