/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { FAKE_HUMAN_DELAY, TRAVEL_DELAY } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';
import { GameLogicService } from '@app/services/game-logic/game-logic.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { MovementData } from '@common/player/player-movement-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { BotMovementService } from './bot-movement.service';

describe('BotMovementService', () => {
    let service: BotMovementService;
    let gameManagerService: jest.Mocked<GameManagerService>;
    let gameLogicService: jest.Mocked<GameLogicService>;
    let turnLogicService: jest.Mocked<TurnLogicService>;
    let botUtilsService: jest.Mocked<BotUtilsService>;
    let mockServer: jest.Mocked<Server>;

    const mockGameId = 'test-game-id';

    const GRID_SIZE = 10;
    const MANHATTAN_DISTANCE_EXAMPLE = 7;

    const mockBot: Player = {
        _id: 'bot1',
        name: 'Bot 1',
        position: { x: 1, y: 1 },
        speed: 1,
        actionPoints: 1,
    } as Player;

    const mockEnemy: Player = {
        _id: 'enemy1',
        name: 'Enemy 1',
        position: { x: 3, y: 3 },
    } as Player;

    const mockEnemies: Player[] = [mockEnemy];

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockBot, ...mockEnemies],
        gridState: {
            grid: Array(GRID_SIZE)
                .fill(0)
                .map(() => Array(GRID_SIZE).fill({ isTraversable: true, isDoor: false })),
        } as any,
    };

    const mockAccessibleTiles: Coordinate[] = [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
    ];

    const mockTarget: Coordinate = { x: 4, y: 4 };

    const mockPath: Coordinate[] = [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
        { x: 4, y: 4 },
    ];

    const mockMovementResult: MovementData = {
        players: [mockBot],
        playerId: mockBot._id,
        path: [
            { x: 1, y: 1 },
            { x: 1, y: 2 },
        ],
        isEndingOnItem: false,
    };

    beforeEach(async () => {
        gameManagerService = {
            getAccessibleTileForPlayer: jest.fn().mockReturnValue(mockAccessibleTiles),
            toggleDoorState: jest.fn(),
            movePlayer: jest.fn().mockReturnValue(mockMovementResult),
            pickupItem: jest.fn(),
        } as unknown as jest.Mocked<GameManagerService>;

        gameLogicService = {
            getPathWithClosedDoors: jest.fn().mockReturnValue(mockPath),
        } as unknown as jest.Mocked<GameLogicService>;

        turnLogicService = {
            endBotTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        botUtilsService = {
            getAliveEnemies: jest.fn().mockReturnValue(mockEnemies),
            getAdjacentEnemyToAttack: jest.fn(),
        } as unknown as jest.Mocked<BotUtilsService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BotMovementService,
                { provide: GameManagerService, useValue: gameManagerService },
                { provide: GameLogicService, useValue: gameLogicService },
                { provide: TurnLogicService, useValue: turnLogicService },
                { provide: BotUtilsService, useValue: botUtilsService },
            ],
        }).compile();

        service = module.get<BotMovementService>(BotMovementService);
        service.setServer(mockServer);
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set server', () => {
            service.setServer(mockServer);
            expect((service as any).server).toBe(mockServer);
        });
    });

    describe('moveTowardsTargetAndShouldRecallBotBehavior', () => {
        it('should handle null movement without errors and not pick up items', async () => {
            gameManagerService.movePlayer.mockReturnValueOnce(null);

            const botWithActionPoints = { ...mockBot, actionPoints: 2 };
            botUtilsService.getAdjacentEnemyToAttack.mockReturnValueOnce(null);

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, botWithActionPoints, mockTarget, false);

            jest.advanceTimersByTime(FAKE_HUMAN_DELAY + TRAVEL_DELAY * 1 * 2);

            expect(gameManagerService.pickupItem).not.toHaveBeenCalled();
            expect(mockServer.emit).not.toHaveBeenCalledWith(GameGatewayEvents.UpdateItems);
            expect(mockServer.emit).not.toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);

            const result = await promiseResult;
            expect(result).toBe(false);
            expect(turnLogicService.endBotTurn).toHaveBeenCalled();
        });

        it('should end bot turn and resolve false if best tile not found and coming from default behavior', async () => {
            gameManagerService.getAccessibleTileForPlayer.mockReturnValueOnce([]);

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, mockBot, mockTarget, true);

            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(mockGame, mockBot);
            expect(gameManagerService.getAccessibleTileForPlayer).toHaveBeenCalledWith(mockGameId, mockBot._id);
            expect(turnLogicService.endBotTurn).toHaveBeenCalledWith(mockGameId);

            const result = await promiseResult;
            expect(result).toBe(false);
        });

        it('should resolve true if best tile not found and not coming from default behavior', async () => {
            gameManagerService.getAccessibleTileForPlayer.mockReturnValueOnce([]);

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, mockBot, mockTarget, false);

            expect(turnLogicService.endBotTurn).not.toHaveBeenCalled();

            const result = await promiseResult;
            expect(result).toBe(true);
        });

        it('should move bot and pick up item if ending on an item', async () => {
            const movementWithItem = {
                ...mockMovementResult,
                isEndingOnItem: true,
                path: [
                    { x: 1, y: 1 },
                    { x: 2, y: 2 },
                ],
            };

            const botWithActionPoints = { ...mockBot, actionPoints: 2 };
            botUtilsService.getAdjacentEnemyToAttack.mockReturnValueOnce(mockEnemy);

            gameManagerService.movePlayer.mockReturnValueOnce(movementWithItem);

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, botWithActionPoints, mockTarget, false);

            jest.advanceTimersByTime(FAKE_HUMAN_DELAY);

            expect(gameManagerService.movePlayer).toHaveBeenCalled();

            jest.advanceTimersByTime(TRAVEL_DELAY * 2 * 2);

            expect(gameManagerService.pickupItem).toHaveBeenCalledWith(
                mockGame,
                botWithActionPoints._id,
                movementWithItem.path[movementWithItem.path.length - 1],
            );

            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems, mockGame.players);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated, mockGame.players);

            const result = await promiseResult;
            expect(result).toBe(true);
        });

        it('should end turn if bot has no more action points and speed <= 1', async () => {
            const slowBot = { ...mockBot, speed: 1, actionPoints: 0 };

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, slowBot, mockTarget, false);

            jest.advanceTimersByTime(FAKE_HUMAN_DELAY);

            jest.advanceTimersByTime(TRAVEL_DELAY * 2 * 2);

            expect(turnLogicService.endBotTurn).toHaveBeenCalledWith(mockGameId);

            const result = await promiseResult;
            expect(result).toBe(false);
        });

        it('should end turn if bot has speed <= 1 and no adjacent enemy to attack', async () => {
            botUtilsService.getAdjacentEnemyToAttack.mockReturnValueOnce(null);

            const slowBot = { ...mockBot, speed: 1, actionPoints: 1 };

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, slowBot, mockTarget, false);

            jest.advanceTimersByTime(FAKE_HUMAN_DELAY);

            jest.advanceTimersByTime(TRAVEL_DELAY * 2 * 2);

            expect(turnLogicService.endBotTurn).toHaveBeenCalledWith(mockGameId);

            const result = await promiseResult;
            expect(result).toBe(false);
        });

        it('should continue turn if bot has action points and adjacent enemy to attack', async () => {
            botUtilsService.getAdjacentEnemyToAttack.mockReturnValueOnce(mockEnemy);

            const promiseResult = service.moveTowardsTargetAndShouldRecallBotBehavior(mockGame as Game, mockBot, mockTarget, false);

            jest.advanceTimersByTime(FAKE_HUMAN_DELAY);

            jest.advanceTimersByTime(TRAVEL_DELAY * 2 * 2);

            expect(turnLogicService.endBotTurn).not.toHaveBeenCalled();

            const result = await promiseResult;
            expect(result).toBe(true);
        });
    });

    describe('checkAndOpenDoorIfPossible', () => {
        it('should skip positions outside grid boundaries', () => {
            const edgeBot = {
                ...mockBot,
                position: { x: 0, y: 0 },
            };

            const smallGrid = [[{ isTraversable: true, isDoor: false }]];

            const gameWithSmallGrid = {
                ...mockGame,
                id: mockGameId,
                gridState: {
                    grid: smallGrid,
                } as any,
            };

            gameLogicService.getPathWithClosedDoors.mockReturnValueOnce([{ x: 0, y: 0 }]);

            service.checkAndOpenDoorIfPossible(gameWithSmallGrid as Game, edgeBot, { x: 1, y: 1 });

            expect(gameManagerService.toggleDoorState).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: -1, y: 0 });
            expect(gameManagerService.toggleDoorState).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: 0, y: -1 });
            expect(gameManagerService.toggleDoorState).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: 1, y: 0 });
            expect(gameManagerService.toggleDoorState).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: 0, y: 1 });
        });

        it('should handle adjacent positions outside grid boundaries', () => {
            const edgeBot = {
                ...mockBot,
                position: { x: 0, y: 0 },
            };

            const smallGrid = [
                [
                    { isTraversable: true, isDoor: false },
                    { isTraversable: true, isDoor: false },
                ],
                [
                    { isTraversable: true, isDoor: false },
                    { isTraversable: true, isDoor: false },
                ],
            ];

            const gameWithSmallGrid = {
                ...mockGame,
                gridState: {
                    grid: smallGrid,
                } as any,
            };

            const getPathSpy = jest.spyOn(gameLogicService, 'getPathWithClosedDoors');
            const toggleDoorSpy = jest.spyOn(gameManagerService, 'toggleDoorState');

            smallGrid[1][0] = { isDoor: true, isTraversable: false };

            getPathSpy.mockReturnValueOnce([
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 1, y: 1 },
            ]);

            toggleDoorSpy.mockReturnValueOnce(true);

            const result = service.checkAndOpenDoorIfPossible(gameWithSmallGrid as Game, edgeBot, { x: 1, y: 1 });

            expect(toggleDoorSpy).toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: 1, y: 0 });
            expect(result).toBe(true);

            expect(toggleDoorSpy).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: -1, y: 0 });
            expect(toggleDoorSpy).not.toHaveBeenCalledWith(mockGameId, edgeBot._id, { x: 0, y: -1 });

            getPathSpy.mockRestore();
            toggleDoorSpy.mockRestore();
        });

        it('should open a door if it is adjacent and on the path', () => {
            const gridWithDoor = Array(GRID_SIZE)
                .fill(0)
                .map(() => Array(GRID_SIZE).fill({ isTraversable: true, isDoor: false }));
            gridWithDoor[2][1] = { isDoor: true, isTraversable: false };

            const gameWithDoor = {
                ...mockGame,
                gridState: { grid: gridWithDoor } as any,
            };

            const pathWithDoor = [
                { x: 1, y: 1 },
                { x: 2, y: 1 },
                { x: 3, y: 1 },
            ];

            gameLogicService.getPathWithClosedDoors.mockReturnValueOnce(pathWithDoor);
            gameManagerService.toggleDoorState.mockReturnValueOnce(true);

            const result = service.checkAndOpenDoorIfPossible(gameWithDoor as Game, mockBot, mockTarget);

            expect(gameLogicService.getPathWithClosedDoors).toHaveBeenCalledWith(gameWithDoor, mockBot.position, mockTarget);
            expect(gameManagerService.toggleDoorState).toHaveBeenCalledWith(mockGameId, mockBot._id, { x: 2, y: 1 });
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.GridUpdated, { updatedTile: { x: 2, y: 1 } });
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
            expect(result).toBe(true);
        });

        it('should not open a door if it is not on the path', () => {
            const gridWithDoor = Array(GRID_SIZE)
                .fill(0)
                .map(() => Array(GRID_SIZE).fill({ isTraversable: true, isDoor: false }));
            gridWithDoor[2][1] = { isDoor: true, isTraversable: false };

            const gameWithDoor = {
                ...mockGame,
                gridState: { grid: gridWithDoor } as any,
            };

            const pathWithoutDoor = [
                { x: 1, y: 1 },
                { x: 1, y: 2 },
                { x: 1, y: 3 },
            ];

            gameLogicService.getPathWithClosedDoors.mockReturnValueOnce(pathWithoutDoor);

            const result = service.checkAndOpenDoorIfPossible(gameWithDoor as Game, mockBot, mockTarget);

            expect(gameManagerService.toggleDoorState).not.toHaveBeenCalled();
            expect(result).toBe(false);
        });

        it('should return false if no doors are found', () => {
            const result = service.checkAndOpenDoorIfPossible(mockGame as Game, mockBot, mockTarget);
            expect(result).toBe(false);
        });
    });

    describe('findBestTileTowardTarget', () => {
        it('should skip tiles with undefined tileType in findBestTileToTarget', () => {
            const gridWithUndefined = mockGame.gridState.grid.map((row) => [...row]);
            gridWithUndefined[2][1] = undefined;
            const gameWithUndefinedTile = {
                ...mockGame,
                gridState: { grid: gridWithUndefined },
            } as Game;

            const sortedTiles = [
                { x: 2, y: 1 },
                { x: 1, y: 2 },
                { x: 0, y: 1 },
            ];

            gameLogicService.getPathWithClosedDoors.mockImplementation((game, from, to) => {
                if (from.x === 2 && from.y === 1) {
                    return null;
                } else if (from.x === 1 && from.y === 2) {
                    return [from, { x: 2, y: 2 }, { x: 3, y: 3 }, to];
                } else if (from.x === 0 && from.y === 1) {
                    return [from, { x: 0, y: 2 }, { x: 0, y: 3 }, { x: 1, y: 4 }, { x: 2, y: 4 }, to];
                }
                return null;
            });

            const bestResult = (service as any).findBestTileToTarget(gameWithUndefinedTile, mockBot, mockTarget, sortedTiles);

            expect(bestResult.bestTile).toEqual({ x: 1, y: 2 });
            expect(bestResult.nbTiles).toBe(1);
        });

        it('should handle game with null gridState', () => {
            const gameWithNullGridState = {
                ...mockGame,
                gridState: null,
            } as Game;

            const sortedTiles = [
                { x: 2, y: 1 },
                { x: 1, y: 2 },
                { x: 0, y: 1 },
            ];

            const bestResult = (service as any).findBestTileToTarget(gameWithNullGridState, mockBot, mockTarget, sortedTiles);

            expect(bestResult.bestTile).toBeNull();
            expect(bestResult.nbTiles).toBe(1);
        });

        it('should return null if accessible tiles are empty', () => {
            const result = service.findBestTileTowardTarget(mockGame as Game, mockBot, mockTarget, []);
            expect(result).toBeNull();
        });

        it('should return null if target position is null', () => {
            const result = service.findBestTileTowardTarget(mockGame as Game, mockBot, null, mockAccessibleTiles);
            expect(result).toBeNull();
        });

        it('should return null if only accessible tile is bot position', () => {
            const result = service.findBestTileTowardTarget(mockGame as Game, mockBot, mockTarget, [mockBot.position]);
            expect(result).toBeNull();
        });

        it('should find the best tile closest to target', () => {
            gameLogicService.getPathWithClosedDoors
                .mockReturnValueOnce([])
                .mockReturnValueOnce([
                    { x: 2, y: 1 },
                    { x: 3, y: 2 },
                    { x: 4, y: 3 },
                ])
                .mockReturnValueOnce([
                    { x: 0, y: 1 },
                    { x: 0, y: 2 },
                    { x: 0, y: 3 },
                    { x: 1, y: 4 },
                ]);

            const result = service.findBestTileTowardTarget(mockGame as Game, mockBot, mockTarget, mockAccessibleTiles);

            expect(result).toEqual({
                bestTile: { x: 2, y: 1 },
                nbTiles: 1,
            });
        });
    });

    describe('moveToTile', () => {
        it('should call gameManagerService.movePlayer and emit events', () => {
            const result = service.moveToTile(mockGame as Game, mockBot, { x: 1, y: 2 });

            expect(gameManagerService.movePlayer).toHaveBeenCalledWith({
                movingPlayerId: mockBot._id,
                gameId: mockGameId,
                sourcePosition: mockBot.position,
                targetPosition: { x: 1, y: 2 },
            });

            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.MovePlayer, mockMovementResult);
            expect(result).toBe(mockMovementResult);
        });

        it('should not emit events if movement result has no players', () => {
            gameManagerService.movePlayer.mockReturnValueOnce(null);

            const result = service.moveToTile(mockGame as Game, mockBot, { x: 1, y: 2 });

            expect(mockServer.emit).not.toHaveBeenCalled();
            expect(result).toBeNull();
        });
    });

    describe('isPositionInAccessibleTiles', () => {
        it('should return true if position is in accessible tiles', () => {
            const result = service.isPositionInAccessibleTiles({ x: 1, y: 2 }, mockAccessibleTiles);
            expect(result).toBe(true);
        });

        it('should return false if position is not in accessible tiles', () => {
            const result = service.isPositionInAccessibleTiles({ x: 5, y: 5 }, mockAccessibleTiles);
            expect(result).toBe(false);
        });
    });

    describe('isSamePosition', () => {
        it('should return true for identical positions', () => {
            const result = service.isSamePosition({ x: 1, y: 2 }, { x: 1, y: 2 });
            expect(result).toBe(true);
        });

        it('should return false for different positions', () => {
            const result = service.isSamePosition({ x: 1, y: 2 }, { x: 2, y: 1 });
            expect(result).toBe(false);
        });
    });

    describe('private methods', () => {
        it('should sort tiles by distance from bot', () => {
            const sortTilesByDistanceFromBot = (service as any).sortTilesByDistanceFromBot;

            const unsortedTiles = [
                { x: 5, y: 5 },
                { x: 2, y: 1 },
                { x: 3, y: 3 },
                { x: 1, y: 2 },
            ];

            const botPosition = { x: 1, y: 1 };

            const result = sortTilesByDistanceFromBot(unsortedTiles, botPosition);

            expect(result[0]).toEqual({ x: 2, y: 1 });
            expect(result[1]).toEqual({ x: 1, y: 2 });
            expect(result[2]).toEqual({ x: 3, y: 3 });
            expect(result[3]).toEqual({ x: 5, y: 5 });
        });

        it('should calculate Manhattan distance correctly', () => {
            const calculateManhattanDistance = (service as any).calculateManhattanDistance;

            const botPosition = { x: 1, y: 1 };
            const targetPosition = { x: 4, y: 5 };

            const result = calculateManhattanDistance(botPosition, targetPosition);

            expect(result).toBe(MANHATTAN_DISTANCE_EXAMPLE);
        });

        it('should return 1 if target position is null', () => {
            const calculateManhattanDistance = (service as any).calculateManhattanDistance;

            const botPosition = { x: 1, y: 1 };

            const result = calculateManhattanDistance(botPosition, null);

            expect(result).toBe(1);
        });
    });
});
