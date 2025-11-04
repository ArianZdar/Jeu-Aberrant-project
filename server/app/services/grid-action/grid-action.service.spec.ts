import { Game } from '@app/model/class/game/game';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { GameItem } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { MovementData, PlayerMovementInfo } from '@common/player/player-movement-info';
import { ShortestPath } from '@common/grid/shortest-path';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { GridActionService } from './grid-action.service';

describe('GridActionService', () => {
    let service: GridActionService;
    let mockServer: Partial<Server>;
    let gameManagerServiceMock: Partial<GameManagerService>;

    const mockGameId = 'game-123';
    const mockPlayerId = 'player-123';

    const mockCoordinate: Coordinate = { x: 5, y: 5 };
    const mockPlayerPosition: Coordinate = { x: 3, y: 3 };
    const mockTargetPosition: Coordinate = { x: 7, y: 7 };

    const mockPlayer: Partial<Player> = {
        _id: mockPlayerId,
        position: mockPlayerPosition,
        isTurn: true,
        actionPoints: 2,
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockPlayer as Player],
    };

    const mockPath: Coordinate[] = [
        { x: 3, y: 3 },
        { x: 4, y: 3 },
        { x: 5, y: 4 },
        { x: 6, y: 5 },
        { x: 7, y: 6 },
        { x: 7, y: 7 },
    ];

    const mockShortestPath: ShortestPath = {
        path: mockPath,
        firstItemOnPath: undefined,
    };

    const mockShortestPathWithItem: ShortestPath = {
        path: mockPath,
        firstItemOnPath: {
            position: { x: 5, y: 4 },
            item: GameObjects.Shield,
        } as GameItem,
    };

    const mockMovementInfo: PlayerMovementInfo = {
        gameId: mockGameId,
        movingPlayerId: mockPlayerId,
        sourcePosition: mockPlayerPosition,
        targetPosition: mockTargetPosition,
    };

    const mockMovementData: MovementData = {
        players: [mockPlayer as Player],
        playerId: mockPlayerId,
        path: mockPath,
        isEndingOnItem: false,
    };

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        gameManagerServiceMock = {
            findGameByPlayerId: jest.fn().mockReturnValue(mockGame),
            toggleDoorState: jest.fn().mockReturnValue(true),
            breakWall: jest.fn().mockReturnValue(true),
            getAccessibleTileForPlayer: jest.fn().mockReturnValue([mockCoordinate]),
            movePlayer: jest.fn().mockReturnValue(mockMovementData),
            getShortestPathToTile: jest.fn().mockReturnValue(mockShortestPath),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [GridActionService, { provide: GameManagerService, useValue: gameManagerServiceMock }],
        }).compile();

        service = module.get<GridActionService>(GridActionService);
        service.setServer(mockServer as Server);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server instance', () => {
            const newServer = {
                emit: jest.fn(),
                to: jest.fn().mockReturnThis(),
            } as unknown as Server;

            service.setServer(newServer);

            service.useDoor(mockPlayerId, mockCoordinate);
            expect(newServer.to).toHaveBeenCalled();
        });
    });

    describe('useDoor', () => {
        it('should toggle a door state and emit grid update', async () => {
            await service.useDoor(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.toggleDoorState).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockCoordinate);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.GridUpdated, {
                updatedTile: mockCoordinate,
                breakWall: false,
            });
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
        });

        it('should not toggle door if game is not found', async () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            await service.useDoor(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.toggleDoorState).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not toggle door if door coordinates are undefined', async () => {
            await service.useDoor(mockPlayerId, undefined);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.toggleDoorState).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not emit updates if toggle is unsuccessful', async () => {
            gameManagerServiceMock.toggleDoorState = jest.fn().mockReturnValue(false);

            await service.useDoor(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.toggleDoorState).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockCoordinate);
            expect(mockServer.to).not.toHaveBeenCalled();
        });
    });

    describe('breakWall', () => {
        it('should break a wall and emit grid update', async () => {
            await service.breakWall(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.breakWall).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockCoordinate);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.GridUpdated, {
                updatedTile: mockCoordinate,
                breakWall: true,
            });
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
        });

        it('should not break wall if game is not found', async () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            await service.breakWall(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.breakWall).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not break wall if coordinates are undefined', async () => {
            await service.breakWall(mockPlayerId, undefined);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.breakWall).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not emit updates if break is unsuccessful', async () => {
            gameManagerServiceMock.breakWall = jest.fn().mockReturnValue(false);

            await service.breakWall(mockPlayerId, mockCoordinate);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.breakWall).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockCoordinate);
            expect(mockServer.to).not.toHaveBeenCalled();
        });
    });

    describe('getAccessibleTiles', () => {
        it('should return accessible tiles for a player', () => {
            const result = service.getAccessibleTiles(mockPlayerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.getAccessibleTileForPlayer).toHaveBeenCalledWith(mockGameId, mockPlayerId);
            expect(result).toEqual([mockCoordinate]);
        });

        it('should return empty array if game is not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            const result = service.getAccessibleTiles(mockPlayerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.getAccessibleTileForPlayer).not.toHaveBeenCalled();
            expect(result).toEqual([]);
        });

        it('should return empty array if getAccessibleTileForPlayer returns undefined', () => {
            gameManagerServiceMock.getAccessibleTileForPlayer = jest.fn().mockReturnValue(undefined);

            const result = service.getAccessibleTiles(mockPlayerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.getAccessibleTileForPlayer).toHaveBeenCalledWith(mockGameId, mockPlayerId);
            expect(result).toEqual([]);
        });
    });

    describe('movePlayer', () => {
        it('should move a player and emit the movement data', () => {
            service.movePlayer(mockMovementInfo);

            expect(gameManagerServiceMock.movePlayer).toHaveBeenCalledWith(mockMovementInfo);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.MovePlayer, mockMovementData);
        });

        it('should not emit if movePlayer returns undefined', () => {
            gameManagerServiceMock.movePlayer = jest.fn().mockReturnValue(undefined);

            service.movePlayer(mockMovementInfo);

            expect(gameManagerServiceMock.movePlayer).toHaveBeenCalledWith(mockMovementInfo);
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not emit if movePlayer returns without players', () => {
            gameManagerServiceMock.movePlayer = jest.fn().mockReturnValue({ ...mockMovementData, players: undefined });

            service.movePlayer(mockMovementInfo);

            expect(gameManagerServiceMock.movePlayer).toHaveBeenCalledWith(mockMovementInfo);
            expect(mockServer.to).not.toHaveBeenCalled();
        });
    });

    describe('getShortestPathToTile', () => {
        it('should return the shortest path to a destination', () => {
            const data = {
                gameId: mockGameId,
                playerId: mockPlayerId,
                destination: mockTargetPosition,
            };

            const result = service.getShortestPathToTile(data);

            expect(gameManagerServiceMock.getShortestPathToTile).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockTargetPosition);
            expect(result).toEqual(mockShortestPath);
        });

        it('should return empty path if gameId is missing', () => {
            const data = {
                gameId: undefined,
                playerId: mockPlayerId,
                destination: mockTargetPosition,
            };

            const result = service.getShortestPathToTile(data);

            expect(gameManagerServiceMock.getShortestPathToTile).not.toHaveBeenCalled();
            expect(result).toEqual({ path: [], firstItemOnPath: undefined });
        });

        it('should return empty path if playerId is missing', () => {
            const data = {
                gameId: mockGameId,
                playerId: undefined,
                destination: mockTargetPosition,
            };

            const result = service.getShortestPathToTile(data);

            expect(gameManagerServiceMock.getShortestPathToTile).not.toHaveBeenCalled();
            expect(result).toEqual({ path: [], firstItemOnPath: undefined });
        });

        it('should return empty path if destination is missing', () => {
            const data = {
                gameId: mockGameId,
                playerId: mockPlayerId,
                destination: undefined,
            };

            const result = service.getShortestPathToTile(data);

            expect(gameManagerServiceMock.getShortestPathToTile).not.toHaveBeenCalled();
            expect(result).toEqual({ path: [], firstItemOnPath: undefined });
        });

        it('should return a path with the first item when item is on path', () => {
            const data = {
                gameId: mockGameId,
                playerId: mockPlayerId,
                destination: mockTargetPosition,
            };

            gameManagerServiceMock.getShortestPathToTile = jest.fn().mockReturnValue(mockShortestPathWithItem);

            const result = service.getShortestPathToTile(data);

            expect(gameManagerServiceMock.getShortestPathToTile).toHaveBeenCalledWith(mockGameId, mockPlayerId, mockTargetPosition);
            expect(result).toEqual(mockShortestPathWithItem);
            expect(result.firstItemOnPath).toBeDefined();
            expect(result.firstItemOnPath.item).toBe(GameObjects.Shield);
        });
    });
});
