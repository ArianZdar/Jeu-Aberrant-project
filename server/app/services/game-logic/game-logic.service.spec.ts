/* eslint-disable max-lines */

import { LAST_INDEX, MIN_PATH_AROUND_OBSTACLE, PATH_LENGTH_SIMPLE_CASE } from '@app/constants/server-test-constants';
import { Game } from '@app/model/class/game/game';
import { ChatService } from '@app/services/chat/chat.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { TileState } from '@common/grid/grid-state';
import { ShortestPath } from '@common/grid/shortest-path';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { GameLogicService } from './game-logic.service';
import { mockGameIce, mockGameNoItems, mockGameOnlyGrass, mockGameWithItems, mockItemArray, mockPlayers, smallGameGridGrass } from './mock-game';

function initializeGrid(grid: TileState[][], tileCost = 1, isTraversable = true): void {
    for (const row of grid) {
        for (const tile of row) {
            tile.tileCost = tileCost;
            tile.isTraversable = isTraversable;
        }
    }
}

describe('GameLogicService', () => {
    let service: GameLogicService;
    let itemBehaviorServiceMock: jest.Mocked<ItemBehaviorService>;
    let turnLogicServiceMock: jest.Mocked<TurnLogicService>;
    let chatServiceMock: jest.Mocked<ChatService>;

    beforeEach(async () => {
        itemBehaviorServiceMock = {
            applyPassiveItemEffect: jest.fn(),
        } as unknown as jest.Mocked<ItemBehaviorService>;

        chatServiceMock = {
            pickupItemEvent: jest.fn(),
        } as unknown as jest.Mocked<ChatService>;

        turnLogicServiceMock = {
            endTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameLogicService,
                { provide: ItemBehaviorService, useValue: itemBehaviorServiceMock },
                { provide: TurnLogicService, useValue: turnLogicServiceMock },
                { provide: ChatService, useValue: chatServiceMock },
            ],
        }).compile();

        service = module.get<GameLogicService>(GameLogicService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAccessibleTiles', () => {
        beforeEach(() => {
            mockGameOnlyGrass.players[0].position = { x: 0, y: 0 };
            mockGameOnlyGrass.players[1].position = { x: 2, y: 0 };
            mockGameIce.players[0].position = { x: 0, y: 0 };
            mockGameIce.players[1].position = { x: LAST_INDEX, y: LAST_INDEX };
        });

        it('should return empty array when player ID does not exist in game', () => {
            const nonExistentPlayerId = 'non-existent-id';
            const accessibleTiles = service.getAccessibleTiles(mockGameOnlyGrass, nonExistentPlayerId);
            expect(accessibleTiles).toEqual([]);
        });

        it('should include accessible tiles for player', () => {
            const player2 = mockGameIce.players[1];
            const accessibleTiles = service.getAccessibleTiles(mockGameIce, player2._id);
            const shouldNotContain = [
                { x: 0, y: 0 },
                { x: 4, y: 0 },
                { x: 4, y: 1 },
                { x: 4, y: 2 },
                { x: 4, y: 3 },
                { x: 4, y: 4 },
                { x: 4, y: 6 },
                { x: 4, y: 7 },
                { x: 4, y: 8 },
                { x: 4, y: 9 },
            ];

            const shouldContain = [];
            const mapSize = 10;
            for (let x = 0; x < mapSize; x++) {
                for (let y = 0; y < mapSize; y++) {
                    const tile = { x, y };
                    if (!shouldNotContain.some((coord) => coord.x === x && coord.y === y)) {
                        shouldContain.push(tile);
                    }
                }
            }

            shouldContain.forEach((coord) => expect(accessibleTiles).toContainEqual(coord));
            shouldNotContain.forEach((coord) => expect(accessibleTiles).not.toContainEqual(coord));
        });
    });

    describe('getShortestPath', () => {
        let testGame: Game;

        beforeEach(() => {
            testGame = mockGameOnlyGrass;

            testGame.players[0].position = { x: 0, y: 0 };
            testGame.players[1].position = { x: 9, y: 9 };
        });

        it('should return empty array if source or target is invalid', () => {
            const invalidSource: Coordinate = { x: -1, y: 0 };
            const invalidTarget: Coordinate = { x: 100, y: 100 };
            const validCoord: Coordinate = { x: 1, y: 1 };

            let path = service.getShortestPath(testGame, invalidSource, validCoord);
            expect(path).toEqual([]);

            path = service.getShortestPath(testGame, validCoord, invalidTarget);
            expect(path).toEqual([]);
        });

        it('should find the shortest path in a simple case', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 2, y: 2 };

            initializeGrid(testGame.gridState.grid);

            const path = service.getShortestPath(testGame, source, target);

            expect(path[0]).toEqual(source);
            expect(path[path.length - 1]).toEqual(target);

            expect(path.length).toBe(PATH_LENGTH_SIMPLE_CASE);

            for (let i = 1; i < path.length; i++) {
                const prev = path[i - 1];
                const curr = path[i];
                const manhattanDist = Math.abs(prev.x - curr.x) + Math.abs(prev.y - curr.y);
                expect(manhattanDist).toBe(1);
            }
        });

        it('should avoid occupied positions except the target', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 3, y: 0 };

            initializeGrid(testGame.gridState.grid);

            testGame.players[1].position = { x: 1, y: 0 };

            const path = service.getShortestPath(testGame, source, target);

            expect(path.some((coord) => coord.x === 1 && coord.y === 0)).toBeFalsy();

            expect(path.length).toBeGreaterThan(MIN_PATH_AROUND_OBSTACLE);
            expect(path[0]).toEqual(source);
            expect(path[path.length - 1]).toEqual(target);
        });

        it('should consider tile costs when finding the path', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 2, y: 0 };

            initializeGrid(testGame.gridState.grid);

            testGame.gridState.grid[1][0].tileCost = 10;
            testGame.gridState.grid[0][1].tileCost = 1;
            testGame.gridState.grid[1][1].tileCost = 1;
            testGame.gridState.grid[2][1].tileCost = 1;

            const path = service.getShortestPath(testGame, source, target);

            expect(path.length).toBe(PATH_LENGTH_SIMPLE_CASE);
            expect(path).toContainEqual({ x: 0, y: 1 });
            expect(path).toContainEqual({ x: 1, y: 1 });
            expect(path).toContainEqual({ x: 2, y: 1 });
        });

        it('should allow pathfinding to a position occupied by a player', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const playerPos: Coordinate = { x: 2, y: 2 };
            initializeGrid(testGame.gridState.grid);
            testGame.players[1].position = playerPos;

            const path = service.getShortestPath(testGame, source, playerPos);

            expect(path.length).toBeGreaterThan(0);
            expect(path[0]).toEqual(source);
            expect(path[path.length - 1]).toEqual(playerPos);
        });

        it('should handle single-step paths correctly', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 1, y: 0 };

            const path = service.getShortestPath(testGame, source, target);

            expect(path.length).toBe(2);
            expect(path[0]).toEqual(source);
            expect(path[1]).toEqual(target);
        });
    });

    describe('getShortestPath edge cases', () => {
        let testGame: Game;

        beforeEach(() => {
            testGame = mockGameOnlyGrass;
        });

        it('should handle null or empty grid in isValidPath', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 1, y: 1 };

            const emptyGridGame = {
                gridState: {
                    grid: [],
                },
                players: [],
            } as Game;

            const path = service.getShortestPath(emptyGridGame, source, target);
            expect(path).toEqual([]);
        });

        it('should handle invalid coordinates in isValidCoordinate', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const gridLength = testGame.gridState.grid.length;
            const outOfBoundsX = gridLength + 1;
            const outOfBoundsY = gridLength + 1;

            let target: Coordinate = { x: outOfBoundsX, y: 0 };
            let path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);

            target = { x: 0, y: outOfBoundsY };
            path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);

            target = { x: -1, y: 0 };
            path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);

            target = { x: 0, y: -1 };
            path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);
        });

        it('should handle non-traversable target', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: 1, y: 1 };
            testGame.gridState.grid[target.x][target.y].isTraversable = false;

            const path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);
        });
    });

    describe('calculateDistances edge cases', () => {
        let testGame: Game;

        beforeEach(() => {
            testGame = mockGameOnlyGrass;
        });

        it('should return empty path when no valid path exists', () => {
            const source: Coordinate = { x: 0, y: 0 };
            const target: Coordinate = { x: LAST_INDEX, y: LAST_INDEX };

            for (let i = 8; i <= LAST_INDEX; i++) {
                for (let j = 8; j <= LAST_INDEX; j++) {
                    if (i !== LAST_INDEX || j !== LAST_INDEX) {
                        testGame.gridState.grid[i][j].isTraversable = false;
                    }
                }
            }
            testGame.gridState.grid[7][9].isTraversable = false;
            testGame.gridState.grid[9][7].isTraversable = false;
            testGame.gridState.grid[8][7].isTraversable = false;
            testGame.gridState.grid[7][8].isTraversable = false;

            const path = service.getShortestPath(testGame, source, target);
            expect(path).toEqual([]);
        });
    });

    describe('findFirstItemOnPath', () => {
        let testGame: Game;
        let testPath: Coordinate[];

        beforeEach(() => {
            testGame = mockGameOnlyGrass;

            const rowLength = testGame.gridState.grid[0].length;
            testPath = Array.from({ length: rowLength }, (_, i) => ({ x: i, y: 0 }));
        });

        it('should return undefined if the path is too short', () => {
            testPath = [{ x: 0, y: 0 }];
            const result = service.findFirstItemOnPath(testGame, testPath);
            expect(result).toBeUndefined();
        });

        it('should return undefined when there is no item on the given path', () => {
            const result = service.findFirstItemOnPath(mockGameNoItems, testPath);
            expect(result).toBeUndefined();
        });

        it('should return the first item found if there is an item on the path', () => {
            const result = service.findFirstItemOnPath(mockGameWithItems, testPath);
            expect(result).toBeDefined();
            expect(Object.values(GameObjects)).toContain(result.item);
        });
    });

    describe('isWinningSpawnPointOnPath', () => {
        let testGame: Game;
        let testPath: Coordinate[];

        beforeEach(() => {
            testGame = mockGameOnlyGrass;

            const rowLength = testGame.gridState.grid[0].length;
            testPath = Array.from({ length: rowLength }, (_, i) => ({ x: i, y: 0 }));
            testPath.reverse();

            jest.useFakeTimers();
        });

        it('return value should contain winning: false when given invalid path', () => {
            testPath = [];
            const result = service.isWinningSpawnPointOnPath(testGame, testPath, testGame.players[0]);

            expect(result.winning).toBeFalsy();
        });

        it('return value should contain winning: false when given invalid game', () => {
            const result = service.isWinningSpawnPointOnPath(undefined, testPath, testGame.players[0]);

            expect(result.winning).toBeFalsy();
        });

        it('return value should contain winning: false when given invalid player', () => {
            const result = service.isWinningSpawnPointOnPath(testGame, testPath, undefined);

            expect(result.winning).toBeFalsy();
        });

        it('should return winning: true when path crosses the spawnpoint of the player while they have flag', () => {
            testGame.players[0].spawnPointPosition = { x: 0, y: 0 };
            testGame.players[0].hasFlag = true;

            const result = service.isWinningSpawnPointOnPath(testGame, testPath, testGame.players[0]);
            jest.runAllTimers();

            expect(result.winning).toBeTruthy();
            expect(result.winningPath).toBeDefined();
        });
    });

    describe('trimPathToItem', () => {
        let testShortestPath: ShortestPath;

        beforeEach(() => {
            testShortestPath = {
                path: [
                    { x: 0, y: 1 },
                    { x: 1, y: 1 },
                    { x: 2, y: 1 },
                    { x: 3, y: 1 },
                    { x: 4, y: 1 },
                ],
                firstItemOnPath: {
                    position: { x: 2, y: 1 },
                    item: GameObjects.Armor,
                },
            };
        });

        it('should trim the path if there is an item on the path', () => {
            const result = service.trimPathToItem(testShortestPath);
            expect(result).toBeDefined();
        });

        it('should not trim the path if ther is no item on the path', () => {
            testShortestPath.firstItemOnPath = undefined;
            const result = service.trimPathToItem(testShortestPath);
            expect(result.length === testShortestPath.path.length).toBeTruthy();
        });

        it('should not trim path if the item is outside of the path', () => {
            testShortestPath.firstItemOnPath.position = { x: 999, y: 999 };
            const result = service.trimPathToItem(testShortestPath);
            expect(result.length === testShortestPath.path.length).toBeTruthy();
        });
    });

    describe('pickupItem', () => {
        let testGame: Game;
        let testPlayer: Player;
        let itemPosition: Coordinate;

        beforeEach(() => {
            const testItemArray = [
                { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
                { position: { x: 1, y: 0 }, item: GameObjects.RandomItem },
            ];

            testGame = new Game({
                id: '4321',
                mapId: 'noItems',
                gameMode: GameModes.Classic,
                grid: smallGameGridGrass,
                players: mockPlayers,
                gameItems: testItemArray,
            });

            testPlayer = testGame.players[0];
            testPlayer.position = mockItemArray[0].position;
            itemPosition = mockItemArray[0].position;
        });

        it('should return true if the item exists and is picked up', () => {
            const result = service.pickupItem(testGame, testPlayer._id, itemPosition);
            expect(result).toBeTruthy();
        });

        it('should return false if the player already has max items', () => {
            testPlayer.items = mockItemArray;

            const result = service.pickupItem(testGame, testPlayer._id, itemPosition);
            expect(result).toBeFalsy();
        });

        it('should return false if the item is not found', () => {
            const result = service.pickupItem(testGame, testPlayer._id, { x: -1, y: -1 });
            expect(result).toBeFalsy();
        });

        it('should return false if the positions of the item and player do not match', () => {
            testGame = mockGameWithItems;
            testGame.players[0].position = { x: 999, y: 999 };
            const result = service.pickupItem(testGame, testGame.players[0]._id, itemPosition);

            expect(result).toBeFalsy();
        });
    });

    describe('getPathWithClosedDoors', () => {
        let testGame: Game;
        let source: Coordinate;
        let target: Coordinate;

        beforeEach(() => {
            testGame = new Game({
                id: '4321',
                mapId: 'noItems',
                gameMode: GameModes.Classic,
                grid: smallGameGridGrass,
                players: mockPlayers,
                gameItems: mockItemArray,
            });
            source = { x: 0, y: 0 };
            target = { x: 9, y: 9 };
            testGame.gridState.grid[9][9].isDoor = true;
        });

        it('should return the shortest path towards a tile that does not go through closed doors', () => {
            const result = service.getPathWithClosedDoors(testGame, source, target);
            expect(result).not.toEqual([]);
        });

        it('should return empty path when the wanted path is not valid', () => {
            const result = service.getPathWithClosedDoors(testGame, { x: -99, y: -99 }, target);
            expect(result).toEqual([]);
        });

        it('should return empty path if the target is not a traversable tile', () => {
            target = { x: 0, y: 9 };
            testGame.gridState.grid[target.x][target.y].isTraversable = false;
            testGame.gridState.grid[target.x][target.y].tileCost = Infinity;
            testGame.gridState.grid[target.x][target.y].isDoor = false;

            testGame.gridState.grid[target.x + 1][target.y].isTraversable = false;
            testGame.gridState.grid[target.x + 1][target.y].tileCost = Infinity;

            testGame.gridState.grid[target.x][target.y - 1].isTraversable = false;
            testGame.gridState.grid[target.x][target.y - 1].tileCost = Infinity;

            testGame.players[1].position = { ...target };

            const result = service.getPathWithClosedDoors(testGame, source, target);
            expect(result).toEqual([]);
        });
    });
});
