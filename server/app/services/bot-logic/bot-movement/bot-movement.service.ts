import { FAKE_HUMAN_DELAY, TRAVEL_DELAY } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';
import { GameLogicService } from '@app/services/game-logic/game-logic.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { Coordinate } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { MovementData, PlayerMovementInfo } from '@common/player/player-movement-info';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class BotMovementService {
    private server: Server;

    constructor(
        private gameManagerService: GameManagerService,
        private gameLogicService: GameLogicService,
        private turnLogicService: TurnLogicService,
        private botUtilsService: BotUtilsService,
    ) {}

    setServer(server: Server): void {
        this.server = server;
    }

    async moveTowardsTargetAndShouldRecallBotBehavior(
        game: Game,
        bot: Player,
        target: Coordinate,
        comingFromDefaultBotBehavior: boolean,
    ): Promise<boolean> {
        return new Promise((resolve) => {
            const enemies = this.botUtilsService.getAliveEnemies(game, bot);
            this.checkAndOpenDoorIfPossible(game, bot, target);
            const accessibleTiles = this.gameManagerService.getAccessibleTileForPlayer(game.id, bot._id);

            const result = this.findBestTileTowardTarget(game, bot, target, accessibleTiles);
            if (!result || !result.bestTile) {
                if (comingFromDefaultBotBehavior) this.turnLogicService.endBotTurn(game.id);
                resolve(comingFromDefaultBotBehavior ? false : true);
                return;
            }

            // if(this.isSamePosition(result.bestTile, bot.position)) {
            //     this.turnLogicService.endBotTurn(game.id);
            //     return;
            // }

            setTimeout(() => {
                const movement = this.moveToTile(game, bot, result.bestTile);
                setTimeout(
                    () => {
                        if (movement?.isEndingOnItem) {
                            this.gameManagerService.pickupItem(game, bot._id, movement.path[movement.path.length - 1]);
                            this.server.to(game.id).emit(GameGatewayEvents.UpdateItems, game.players);
                            this.server.to(game.id).emit(GameGatewayEvents.PlayersUpdated, game.players);
                        }

                        if (
                            (bot.speed <= 1 && bot.actionPoints <= 0) ||
                            (bot.speed <= 1 && !this.botUtilsService.getAdjacentEnemyToAttack(bot, enemies))
                        ) {
                            this.turnLogicService.endBotTurn(game.id);
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                    },
                    TRAVEL_DELAY * result.nbTiles * 2,
                );
            }, FAKE_HUMAN_DELAY);
        });
    }

    checkAndOpenDoorIfPossible(game: Game, bot: Player, target: Coordinate): boolean {
        let shortestPathLength = Infinity;
        let pathWithClosedDoors = [];

        const potentialPath = this.gameLogicService.getPathWithClosedDoors(game, bot.position, target);

        if (potentialPath.length > 0 && potentialPath.length < shortestPathLength) {
            shortestPathLength = potentialPath.length;
            pathWithClosedDoors = potentialPath;
        }

        const adjacentPositions = [
            { x: bot.position.x + 1, y: bot.position.y },
            { x: bot.position.x - 1, y: bot.position.y },
            { x: bot.position.x, y: bot.position.y + 1 },
            { x: bot.position.x, y: bot.position.y - 1 },
        ];

        for (const pos of adjacentPositions) {
            if (pos.x < 0 || pos.x >= game.gridState.grid.length || pos.y < 0 || pos.y >= game.gridState.grid[0].length) {
                continue;
            }

            const tile = game.gridState.grid[pos.x][pos.y];
            if (tile.isDoor && !tile.isTraversable) {
                const isDoorOnPath = pathWithClosedDoors.some((coord) => coord.x === pos.x && coord.y === pos.y);
                if (isDoorOnPath) {
                    const doorOpened = this.gameManagerService.toggleDoorState(game.id, bot._id, pos);

                    if (doorOpened) {
                        this.server.to(game.id).emit(GameGatewayEvents.GridUpdated, {
                            updatedTile: pos,
                        });
                        this.server.to(game.id).emit(GameGatewayEvents.PlayersUpdated);
                        return true;
                    }
                }
            }
        }
        return false;
    }

    findBestTileTowardTarget(game: Game, bot: Player, targetPosition: Coordinate, accessibleTiles: Coordinate[]) {
        if (!accessibleTiles.length || !targetPosition) return null;
        if (accessibleTiles.length === 1 && this.isSamePosition(accessibleTiles[0], bot.position)) return null;

        const sortedTiles = this.sortTilesByDistanceFromBot(accessibleTiles, bot.position);
        const bestResult = this.findBestTileToTarget(game, bot, targetPosition, sortedTiles);
        return bestResult;
    }

    moveToTile(game: Game, bot: Player, targetTile: Coordinate): MovementData {
        const playerMovementInfo: PlayerMovementInfo = {
            movingPlayerId: bot._id,
            gameId: game.id,
            sourcePosition: bot.position,
            targetPosition: targetTile,
        };

        const movementResult = this.gameManagerService.movePlayer(playerMovementInfo);
        if (movementResult?.players) {
            this.server.to(game.id).emit(GameGatewayEvents.MovePlayer, movementResult);
        }
        return movementResult;
    }

    isPositionInAccessibleTiles(position: Coordinate, accessibleTiles: Coordinate[]): boolean {
        return accessibleTiles.some((tile) => this.isSamePosition(tile, position));
    }

    isSamePosition(pos1: Coordinate, pos2: Coordinate): boolean {
        return pos1.x === pos2.x && pos1.y === pos2.y;
    }

    private sortTilesByDistanceFromBot(tiles: Coordinate[], botPosition: Coordinate): Coordinate[] {
        return [...tiles].sort((a, b) => {
            const distA = Math.abs(a.x - botPosition.x) + Math.abs(a.y - botPosition.y);
            const distB = Math.abs(b.x - botPosition.x) + Math.abs(b.y - botPosition.y);
            return distA - distB;
        });
    }

    private findBestTileToTarget(game: Game, bot: Player, targetPosition: Coordinate, sortedTiles: Coordinate[]) {
        let bestTile = null;
        let bestPathLength = Infinity;

        for (const tile of sortedTiles) {
            const tileType = game.gridState?.grid[tile.x][tile.y];

            if (!tileType) continue;

            const path = this.gameLogicService.getPathWithClosedDoors(game, tile, targetPosition);
            if (path && path.length > 0 && path.length < bestPathLength) {
                bestPathLength = path.length;
                bestTile = tile;
            }
        }

        return {
            bestTile,
            nbTiles: this.calculateManhattanDistance(bot.position, bestTile),
        };
    }

    private calculateManhattanDistance(botPosition: Coordinate, targetPosition: Coordinate): number {
        return targetPosition ? Math.abs(targetPosition.x - botPosition.x) + Math.abs(targetPosition.y - botPosition.y) : 1;
    }
}
