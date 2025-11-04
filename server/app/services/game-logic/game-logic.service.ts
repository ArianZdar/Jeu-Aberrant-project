import { MIN_PATH_LENGTH } from '@app/constants/server-constants';
import { AccessibleTileQueueItem, PathQueueItem } from '@app/interfaces/server-interfaces';
import { Game } from '@app/model/class/game/game';
import { GameItem } from '@app/model/schema/game-item.schema';
import { ChatService } from '@app/services/chat/chat.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { Coordinate } from '@common/game/game-info';
import { TileState } from '@common/grid/grid-state';
import { ShortestPath, WinningPathResult } from '@common/grid/shortest-path';
import { MAX_ITEMS_PER_PLAYER, Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GameLogicService {
    constructor(
        private readonly itemBehaviorService: ItemBehaviorService,
        private readonly turnLogicService: TurnLogicService,
        private readonly chatService: ChatService,
    ) {}

    getAccessibleTiles(game: Game, playerId: string): Coordinate[] {
        const player = game.players.find((playerToFilter) => playerToFilter._id === playerId);
        if (!player) {
            return [];
        }
        const playerPosition = player.position;
        const playerSpeed = player.speed;
        const grid = game.gridState.grid;
        const accessibleTiles: Coordinate[] = [];

        const occupiedPositions = new Set<string>();
        game.players.forEach((otherPlayer) => {
            if (otherPlayer._id !== playerId) {
                occupiedPositions.add(`${otherPlayer.position.x},${otherPlayer.position.y}`);
            }
        });

        const costs: number[][] = Array(grid.length)
            .fill(0)
            .map(() => Array(grid[0].length).fill(Infinity));

        costs[playerPosition.x][playerPosition.y] = 0;

        const queue: AccessibleTileQueueItem[] = [
            {
                x: playerPosition.x,
                y: playerPosition.y,
                cost: 0,
            },
        ];

        const directions = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
        ];

        while (queue.length > 0) {
            queue.sort((a, b) => a[2] - b[2]);
            const currentNode = queue.shift();

            const { x, y, cost: costSoFar } = currentNode;

            if (!accessibleTiles.some((tile) => tile.x === x && tile.y === y)) {
                accessibleTiles.push({ x, y });
            }

            for (const [dx, dy] of directions) {
                const newX = x + dx;
                const newY = y + dy;

                if (newX >= 0 && newX < grid.length && newY >= 0 && newY < grid[0].length) {
                    const tile = grid[newX][newY];
                    const positionKey = `${newX},${newY}`;
                    const isOccupiedByPlayer = occupiedPositions.has(positionKey);

                    if (tile.isTraversable && !isOccupiedByPlayer) {
                        const newCost = costSoFar + tile.tileCost;
                        if (newCost <= playerSpeed && newCost < costs[newX][newY]) {
                            costs[newX][newY] = newCost;
                            queue.push({ x: newX, y: newY, cost: newCost });
                        }
                    }
                }
            }
        }

        return accessibleTiles;
    }

    getShortestPath(game: Game, source: Coordinate, target: Coordinate): Coordinate[] {
        const grid = game.gridState.grid;
        if (!this.isValidPath(grid, source, target)) return [];

        const occupiedPositions = this.getOccupiedPositions(game, target);
        const { distances, previous } = this.calculateDistances(grid, source, occupiedPositions);

        return distances[target.x][target.y] === Infinity ? [] : this.reconstructPath(source, target, previous);
    }

    findFirstItemOnPath(game: Game, path: Coordinate[]): GameItem | undefined {
        if (!path || !game || path.length < MIN_PATH_LENGTH) return undefined;

        const pathWithoutFirst = path.slice(1);

        const firstItemPositionOnPath = pathWithoutFirst.find((step) =>
            Array.from(game.items).some((item) => this.coordinatesEqual(item.position, step)),
        );

        return firstItemPositionOnPath
            ? Array.from(game.items).find((item) => this.coordinatesEqual(item.position, firstItemPositionOnPath))
            : undefined;
    }

    isWinningSpawnPointOnPath(game: Game, path: Coordinate[], player: Player): WinningPathResult {
        if (!path || !game || !player) return { winning: false };

        const hasPassOnSpawnPoint = path.find((step) => {
            const spawnpoint = player.spawnPointPosition;
            return step.x === spawnpoint.x && step.y === spawnpoint.y;
        });

        if (player.hasFlag && hasPassOnSpawnPoint) {
            return {
                winning: true,
                winningPath: this.getShortestPath(game, player.position, player.spawnPointPosition),
            };
        }

        return { winning: false };
    }

    trimPathToItem(shortestPath: ShortestPath): Coordinate[] {
        if (!shortestPath.firstItemOnPath) return shortestPath.path;

        const endIndex = shortestPath.path.findIndex((step) => this.coordinatesEqual(step, shortestPath.firstItemOnPath.position));

        if (endIndex < 0) return shortestPath.path;

        return shortestPath.path.slice(0, endIndex + 1);
    }

    pickupItem(game: Game, playerId: string, itemPosition: Coordinate): boolean {
        const player = game.players.find((p) => p._id === playerId);

        let foundItem: GameItem | undefined;

        for (const item of game.items) {
            if (this.coordinatesEqual(item.position, itemPosition)) {
                foundItem = item;
                break;
            }
        }

        if (!foundItem) return false;

        if (this.coordinatesEqual(player.position, itemPosition)) {
            foundItem.position = { x: -1, y: -1 };
            player.items.push(foundItem);

            const passiveItemEffectInfo = {
                gameItem: foundItem,
                player,
            };

            this.itemBehaviorService.applyPassiveItemEffect(passiveItemEffectInfo);
            this.chatService.pickupItemEvent(game.id, player, foundItem.item);

            const isInventoryFull = player.items.length > MAX_ITEMS_PER_PLAYER;

            return !isInventoryFull;
        }

        return false;
    }

    getPathWithClosedDoors(game: Game, source: Coordinate, target: Coordinate): Coordinate[] {
        const gridStateCopy = JSON.parse(JSON.stringify(game.gridState));

        for (const row of gridStateCopy.grid) {
            for (const tile of row) {
                if (tile.isDoor) {
                    tile.isTraversable = true;
                    tile.tileCost = 1;
                }
            }
        }

        return this.getShortestPathWithCustomGrid(game, source, target, gridStateCopy.grid);
    }

    private coordinatesEqual(a: Coordinate, b: Coordinate): boolean {
        return a.x === b.x && a.y === b.y;
    }

    private getShortestPathWithCustomGrid(game: Game, source: Coordinate, target: Coordinate, customGrid: TileState[][]): Coordinate[] {
        if (!this.isValidPath(customGrid, source, target)) return [];

        const occupiedPositions = new Set<string>();
        const { distances, previous } = this.calculateDistances(customGrid, source, occupiedPositions);

        return distances[target.x][target.y] === Infinity ? [] : this.reconstructPath(source, target, previous);
    }

    private isValidPath(grid: TileState[][], source: Coordinate, target: Coordinate): boolean {
        if (!grid || grid.length === 0) return false;

        if (
            source.x < 0 ||
            source.x >= grid.length ||
            source.y < 0 ||
            source.y >= grid[0].length ||
            target.x < 0 ||
            target.x >= grid.length ||
            target.y < 0 ||
            target.y >= grid[0].length
        ) {
            return false;
        }

        return grid[target.x][target.y].isTraversable;
    }

    private getOccupiedPositions(game: Game, target: Coordinate): Set<string> {
        const occupiedPositions = new Set<string>();
        game.players.forEach((player) => {
            const posKey = `${player.position.x},${player.position.y}`;
            const targetKey = `${target.x},${target.y}`;
            if (posKey !== targetKey) {
                occupiedPositions.add(posKey);
            }
        });
        return occupiedPositions;
    }

    private calculateDistances(
        grid: TileState[][],
        source: Coordinate,
        occupiedPositions: Set<string>,
    ): {
        distances: number[][];
        previous: Coordinate[][];
    } {
        const distances: number[][] = Array(grid.length)
            .fill(0)
            .map(() => Array(grid[0].length).fill(Infinity));

        const previous: Coordinate[][] = Array(grid.length)
            .fill(0)
            .map(() => Array(grid[0].length).fill(null));

        const steps: number[][] = Array(grid.length)
            .fill(0)
            .map(() => Array(grid[0].length).fill(Infinity));

        distances[source.x][source.y] = 0;
        steps[source.x][source.y] = 0;

        const queue: PathQueueItem[] = [
            {
                node: { x: source.x, y: source.y },
                cost: 0,
                stepCount: 0,
            },
        ];

        const directions = [
            [-1, 0],
            [0, 1],
            [1, 0],
            [0, -1],
        ];

        const visited = new Set<string>();

        while (queue.length > 0) {
            queue.sort((a, b) => {
                if (a.cost !== b.cost) {
                    return a.cost - b.cost;
                }
                return a.stepCount - b.stepCount;
            });

            const shifted = queue.shift();
            const { node: current, stepCount } = shifted;
            const currentKey = `${current.x},${current.y}`;

            visited.add(currentKey);

            for (const [dx, dy] of directions) {
                const newX = current.x + dx;
                const newY = current.y + dy;

                if (this.isValidCoordinate(grid, newX, newY)) {
                    const tile = grid[newX][newY];
                    const positionKey = `${newX},${newY}`;
                    const isOccupiedByPlayer = occupiedPositions.has(positionKey);

                    if (!tile.isTraversable || isOccupiedByPlayer) {
                        continue;
                    }

                    const newDistance = distances[current.x][current.y] + tile.tileCost;
                    const newStepCount = stepCount + 1;

                    if (newDistance < distances[newX][newY] || (newDistance === distances[newX][newY] && newStepCount < steps[newX][newY])) {
                        distances[newX][newY] = newDistance;
                        steps[newX][newY] = newStepCount;
                        previous[newX][newY] = { x: current.x, y: current.y };
                        queue.push({
                            node: { x: newX, y: newY },
                            cost: newDistance,
                            stepCount: newStepCount,
                        });
                    }
                }
            }
        }

        return { distances, previous };
    }

    private isValidCoordinate(grid: TileState[][], x: number, y: number): boolean {
        return x >= 0 && x < grid.length && y >= 0 && y < grid[0].length;
    }

    private reconstructPath(source: Coordinate, target: Coordinate, previous: Coordinate[][]): Coordinate[] {
        const path: Coordinate[] = [];
        let current: Coordinate | null = { x: target.x, y: target.y };

        while (current && !(current.x === source.x && current.y === source.y)) {
            path.unshift(current);
            current = previous[current.x][current.y];
        }

        path.unshift({ x: source.x, y: source.y });

        return path;
    }
}
