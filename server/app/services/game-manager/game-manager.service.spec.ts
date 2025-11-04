/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { getFakeGameInfo } from '@app/fake-game-info';
import { mockGameConfig } from '@app/gateways/game/game-gateway-mocks';
import { Game } from '@app/model/class/game/game';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameLogicService } from '@app/services/game-logic/game-logic.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameModes } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { mockPlayers } from '@common/player/mock-player';
import { PlayerMovementInfo } from '@common/player/player-movement-info';
import { Test, TestingModule } from '@nestjs/testing';
import { GameManagerService } from './game-manager.service';
import { ChatService } from '@app/services/chat/chat.service';

describe('GameManagerService', () => {
    let service: GameManagerService;
    let gameInfoService: jest.Mocked<GameInfoService>;
    let gameLogicService: jest.Mocked<GameLogicService>;
    let combatLogicService: jest.Mocked<CombatLogicService>;
    let turnLogicService: jest.Mocked<TurnLogicService>;
    let botManagerService: jest.Mocked<BotManagerService>;
    let combatTurnLogicService: jest.Mocked<CombatTurnLogicService>;
    let chatService: jest.Mocked<ChatService>;

    let mockGrid: any;
    let mockGame: any;
    let mockedPlayers: any;

    beforeEach(async () => {
        mockedPlayers = mockPlayers;

        mockGrid = {
            grid: [
                [
                    { tileCost: 1, isTraversable: false, isDoor: true },
                    { tileCost: 0, isTraversable: true, isDoor: true },
                ],
                [
                    { tileCost: 1, isTraversable: true },
                    { tileCost: 1, isTraversable: true },
                ],
            ],
        };

        mockGame = {
            id: 'game1',
            players: mockedPlayers,
            mapId: 'map1',
            gameMode: GameModes.Classic,
            gridState: mockGrid,
            isDebugModeActive: false,
            removePlayer: jest.fn((playerId) => {
                const index = mockGame.players.findIndex((player) => player._id === playerId);
                if (index >= 0) {
                    const removedPlayer = mockGame.players.splice(index, 1)[0];
                    return removedPlayer;
                }
                return null;
            }),
            movePlayer: jest.fn().mockReturnValue(mockedPlayers),
            teleportPlayer: jest.fn().mockReturnValue(mockedPlayers),
            isTileOccupied: jest.fn(),
            toggleDebug: jest.fn(),
            delete: jest.fn().mockImplementation(),
        } as unknown as any;

        const gamesMap = new Map<string, Game>();
        gamesMap.set('game1', mockGame);

        gameInfoService = {
            find: jest.fn(),
        } as unknown as jest.Mocked<GameInfoService>;

        gameLogicService = {
            getAccessibleTiles: jest.fn(),
            getShortestPath: jest.fn(),
            findFirstItemOnPath: jest.fn(),
            trimPathToItem: jest.fn(),
            isWinningSpawnPointOnPath: jest.fn(),
        } as unknown as jest.Mocked<GameLogicService>;

        combatTurnLogicService = {
            isCombatActive: jest.fn().mockReturnValue(false),
            endCombat: jest.fn(),
            getCurrentCombatTurnPlayer: jest.fn(),
            getCurrentCombat: jest.fn(),
            startCombat: jest.fn(),
            startCombatTurn: jest.fn(),
            nextCombatTurn: jest.fn(),
            registerBotAttackHandler: jest.fn(),
            setServer: jest.fn(),
        } as unknown as jest.Mocked<CombatTurnLogicService>;

        combatLogicService = {
            executeAttack: jest.fn(),
            executeDebugAttack: jest.fn(),
            respawnPlayer: jest.fn(),
            resetPlayerHealth: jest.fn(),
            setGames: jest.fn(),
            playerAttackLogic: jest.fn(),
            playerWonACombat: jest.fn(),
        } as unknown as jest.Mocked<CombatLogicService>;

        turnLogicService = {
            updatePlayers: jest.fn(),
            getPlayers: jest.fn(),
            cleanupGame: jest.fn(),
            endBotTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        botManagerService = {
            createBot: jest.fn(),
            aggressiveBehavior: jest.fn(),
            defensiveBehavior: jest.fn(),
            setServer: jest.fn(),
        } as unknown as jest.Mocked<BotManagerService>;

        chatService = {
            doorEvent: jest.fn(),
            playerLeftEvent: jest.fn(),
            toggleDebugEvent: jest.fn(),
            pickupItemEvent: jest.fn(),
            startCombatEvent: jest.fn(),
            escapeAttemptEvent: jest.fn(),
            attackEvent: jest.fn(),
            combatEndedEvent: jest.fn(),
            tooManyEscapeAttemptsEvent: jest.fn(),
            nextTurnEvent: jest.fn(),
        } as unknown as jest.Mocked<ChatService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameManagerService,
                { provide: GameInfoService, useValue: gameInfoService },
                { provide: GameLogicService, useValue: gameLogicService },
                { provide: CombatLogicService, useValue: combatLogicService },
                { provide: TurnLogicService, useValue: turnLogicService },
                { provide: BotManagerService, useValue: botManagerService },
                { provide: CombatTurnLogicService, useValue: combatTurnLogicService },
                { provide: ChatService, useValue: chatService },
            ],
        }).compile();

        service = module.get<GameManagerService>(GameManagerService);
        Object.defineProperty(service, '_games', {
            value: gamesMap,
        });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getGame', () => {
        it('should return the game with the given id', () => {
            const result = service.getGame('game1');
            expect(result).toEqual(mockGame);
        });

        it('should return undefined if game is not found', () => {
            const result = service.getGame('nonexistent');
            expect(result).toBeUndefined();
        });
    });

    describe('getPlayers', () => {
        it('should return the players of a game', () => {
            const players = service.getPlayers('game1');
            expect(players).toEqual(mockedPlayers);
        });

        it('should return empty array if game is not found', () => {
            const players = service.getPlayers('nonexistent');
            expect(players).toEqual([]);
        });
    });

    describe('findGameByPlayerId', () => {
        it('should find a game by player id', () => {
            const game = service.findGameByPlayerId('player1');
            expect(game).toEqual(mockGame);
        });

        it('should return undefined if no game with player is found', () => {
            const game = service.findGameByPlayerId('nonexistent');
            expect(game).toBeUndefined();
        });
    });

    describe('toggleDoorState', () => {
        it('should return false if game is not found', () => {
            const result = service.toggleDoorState('nonexistent', 'player1', { x: 0, y: 1 });
            expect(result).toBe(false);
        });

        it('should return false if player is not found or it is not their turn', () => {
            const result1 = service.toggleDoorState('game1', 'nonexistent', { x: 0, y: 1 });
            expect(result1).toBe(false);

            mockGame.players[0].isTurn = false;
            const result2 = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
            expect(result2).toBe(false);

            mockGame.players[0].isTurn = true;
        });

        it('should return false if player has no action points', () => {
            mockGame.players[0].actionPoints = 0;
            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
            expect(result).toBe(false);

            mockGame.players[0].actionPoints = 2;
        });

        // it('should return false if door position is invalid', () => {
        //     const result1 = service.toggleDoorState('game1', 'player1', { x: 50, y: 50 });
        //     expect(result1).toBe(false);

        //     mockGame.gridState.grid[0][1].isDoor = false;
        //     const result2 = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
        //     expect(result2).toBe(false);

        //     mockGame.gridState.grid[0][1].isDoor = true;
        // });

        it('should toggle door state and return true if all conditions are met', () => {
            mockGame.players[0].isTurn = true;
            mockGame.players[0].actionPoints = 2;
            mockGame.gridState.grid[0][1].isDoor = true;
            mockGame.gridState.grid[0][1].isTraversable = false;

            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });

            expect(result).toBe(true);
            expect(mockGame.gridState.grid[0][1].isTraversable).toBe(true);
            expect(mockGame.gridState.grid[0][1].tileCost).toBe(1);
            expect(mockGame.players[0].actionPoints).toBe(1);
        });
    });

    describe('toggleDoorState edge cases', () => {
        // it('should return false if gridState is undefined', () => {
        //     mockGame.gridState = undefined;

        //     const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
        //     expect(result).toBe(false);

        //     mockGame.gridState = { grid: mockGrid.grid };
        // });

        // it('should return false if grid is undefined', () => {
        //     mockGame.gridState.grid = undefined;

        //     const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
        //     expect(result).toBe(false);

        //     mockGame.gridState.grid = mockGrid.grid;
        // });

        // it('should return false if x is negative', () => {
        //     const result = service.toggleDoorState('game1', 'player1', { x: -1, y: 1 });
        //     expect(result).toBe(false);
        // });

        // it('should return false if x is out of bounds', () => {
        //     const result = service.toggleDoorState('game1', 'player1', { x: 100, y: 1 });
        //     expect(result).toBe(false);
        // });

        it('should return false if y is negative', () => {
            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: -1 });
            expect(result).toBe(false);
        });

        it('should return false if y is out of bounds', () => {
            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 100 });
            expect(result).toBe(false);
        });

        it('should return false if tile is not a door', () => {
            mockGame.gridState.grid[0][1].isDoor = false;

            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
            expect(result).toBe(false);

            mockGame.gridState.grid[0][1].isDoor = true;
        });

        it('should set tileCost to 1 if door is opened', () => {
            mockGame.gridState.grid[0][1].isTraversable = false;

            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
            expect(result).toBe(true);
            expect(mockGame.gridState.grid[0][1].isTraversable).toBe(true);
            expect(mockGame.gridState.grid[0][1].tileCost).toBe(1);
        });

        it('should set tileCost to Infinity if door is closed', () => {
            mockGame.players[0].actionPoints = 1;
            mockGame.gridState.grid[0][1].isTraversable = true;

            const result = service.toggleDoorState('game1', 'player1', { x: 0, y: 1 });
            expect(result).toBe(true);
            expect(mockGame.gridState.grid[0][1].isTraversable).toBe(false);
            expect(mockGame.gridState.grid[0][1].tileCost).toBe(Infinity);
        });
    });

    describe('movePlayer', () => {
        // Il faut tenir en compte le spawnpoint sur le chemin

        // it('should move a player when path exists', () => {
        //     const path: Coordinate[] = [
        //         { x: 0, y: 0 },
        //         { x: 0, y: 1 },
        //     ];
        //     gameLogicService.getShortestPath.mockReturnValue(path);
        //     const movementInfo: PlayerMovementInfo = {
        //         gameId: 'game1',
        //         movingPlayerId: 'player1',
        //         sourcePosition: { x: 0, y: 0 },
        //         targetPosition: { x: 0, y: 1 },
        //         isTeleporting: false,
        //     };

        //     gameLogicService.trimPathToItem.mockReturnValue(path);

        //     const result = service.movePlayer(movementInfo);
        //     expect(result).toEqual({
        //         players: mockedPlayers,
        //         playerId: 'player1',
        //         path,
        //         isEndingOnItem: false,
        //     });
        // });

        // it('should not move player when path does not exist', () => {
        //     gameLogicService.getShortestPath.mockReturnValue([]);
        //     const movementInfo: PlayerMovementInfo = {
        //         gameId: 'game1',
        //         movingPlayerId: 'player1',
        //         sourcePosition: { x: 0, y: 0 },
        //         targetPosition: { x: 0, y: 1 },
        //         isTeleporting: false,
        //     };

        //     const result = service.movePlayer(movementInfo);
        //     expect(result).toBeUndefined();
        // });

        it('should return undefined if game is not found', () => {
            const movementInfo: PlayerMovementInfo = {
                gameId: 'nonexistent',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: false,
            };

            const result = service.movePlayer(movementInfo);
            expect(result).toBeUndefined();
        });

        it('should return undefined if player is not found', () => {
            const movementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'nonexistent',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: false,
            };

            const result = service.movePlayer(movementInfo);
            expect(result).toBeUndefined();
        });

        it('should return undefined if player is not their turn', () => {
            mockedPlayers[0].isTurn = false;
            const movementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: false,
            };

            const result = service.movePlayer(movementInfo);
            expect(result).toBeUndefined();
            mockedPlayers[0].isTurn = true;
        });

        it('should teleport player if teleporting is enabled and conditions are met', () => {
            mockGame.players[0].isTurn = true;
            Object.defineProperty(mockGame, 'isDebugModeActive', {
                value: true,
            });

            const movementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: true,
            };

            const result = service.movePlayer(movementInfo);
            expect(result.path).toEqual([]);
            mockGame.players[0].isTurn = false;
            mockGame.toggleDebug();

            Object.defineProperty(mockGame, 'isDebugModeActive', {
                value: false,
            });
        });
    });

    describe('opponentDisconnectedInCombat', () => {
        it('should handle opponent disconnection in combat', () => {
            turnLogicService.getPlayers.mockReturnValue(mockedPlayers);
            combatLogicService.resetPlayerHealth.mockReturnValue(mockedPlayers[0]);

            service.opponentDisconnectedInCombat('player1');

            expect(turnLogicService.getPlayers).toHaveBeenCalledWith('game1');
            expect(combatLogicService.resetPlayerHealth).toHaveBeenCalled();
            expect(combatLogicService.playerWonACombat).toHaveBeenCalled();
        });
    });

    describe('createGame', () => {
        it('should create game given a valid gameConfig', async () => {
            Object.defineProperty(service, '_games', {
                value: new Map<string, Game>(),
            });

            const gameInfo = getFakeGameInfo();
            mockGameConfig.id = gameInfo._id;
            gameInfoService.find.mockResolvedValue(gameInfo);

            await service.createGame(mockGameConfig);

            expect(service.getGame(gameInfo._id)).toBeDefined();
        });

        it('should not work if game already exists', async () => {
            const gameInfo = getFakeGameInfo();
            mockGameConfig.id = gameInfo._id;
            gameInfoService.find.mockResolvedValue(gameInfo);

            await service.createGame(mockGameConfig);
            const response = await service.createGame(mockGameConfig);
            expect(response).toBeUndefined();
        });

        it('should not work if the game info is not found in the db', async () => {
            const gameInfo = getFakeGameInfo();
            mockGameConfig.id = gameInfo._id;
            gameInfoService.find.mockResolvedValue(undefined);

            const response = await service.createGame(mockGameConfig);

            expect(response).toBeUndefined();
        });
    });

    describe('updatePlayerConnectionStatus', () => {
        it('should call update players when given a valid id', () => {
            service.updatePlayerConnectionStatus(mockedPlayers[0]._id, true);

            expect(turnLogicService.updatePlayers).toBeCalled();
        });
    });

    describe('getAccessibleTileForPlayer', () => {
        it('should return accessible tiles for a player', () => {
            const accessibleTiles: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
            ];
            gameLogicService.getAccessibleTiles.mockReturnValue(accessibleTiles);

            const result = service.getAccessibleTileForPlayer('game1', 'player1');
            expect(result).toEqual(accessibleTiles);
        });

        it('should return empty array if game is not found', () => {
            const result = service.getAccessibleTileForPlayer('nonexistent', 'player1');
            expect(result).toEqual([]);
        });
    });

    describe('getShortestPathToTile', () => {
        it('return value should return the shortest path to a tile', () => {
            const path: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 0, y: 1 },
            ];
            gameLogicService.getShortestPath.mockReturnValue(path);

            const result = service.getShortestPathToTile('game1', 'player1', { x: 0, y: 1 });
            expect(result.path).toEqual(path);
        });

        it('return value should contain empty array for path if game is not found', () => {
            const result = service.getShortestPathToTile('nonexistent', 'player1', { x: 0, y: 1 });
            expect(result.path).toEqual([]);
        });

        it('return value should contain an empty array for path if player is not found', () => {
            const result = service.getShortestPathToTile('game1', 'nonexistent', { x: 0, y: 1 });
            expect(result.path).toEqual([]);
        });
    });

    describe('updatePlayerConnectionStatus', () => {
        it('should update player connection status', () => {
            service.updatePlayerConnectionStatus(mockedPlayers[0]._id, true);

            expect(turnLogicService.updatePlayers).toHaveBeenCalledWith('game1', mockedPlayers);
        });

        it('should do nothing if game is not found', () => {
            service.updatePlayerConnectionStatus('nonexistent', true);

            expect(turnLogicService.updatePlayers).not.toHaveBeenCalled();
        });
    });

    describe('teleportPlayer', () => {
        it('should teleport player if conditions are met', () => {
            mockGame.gridState.grid[0][1].isTraversable = true;
            mockGame.isTileOccupied.mockReturnValue(false);
            mockGame.gridState.grid[0][1].object = undefined;

            const playerMovementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: true,
            };

            mockGame.teleportPlayer.mockReturnValue(mockPlayers);

            const result = service.teleportPlayer(mockGame, playerMovementInfo);
            expect(result).toEqual(mockPlayers);
        });

        it('should return undefined if tile is not traversable', () => {
            mockGame.gridState.grid[0][1].isTraversable = false;

            const playerMovementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: true,
            };

            const result = service.teleportPlayer(mockGame, playerMovementInfo);
            expect(result).toBeUndefined();
        });

        it('should return undefined if tile is occupied', () => {
            mockGame.gridState.grid[0][1].isTraversable = true;
            mockGame.isTileOccupied.mockReturnValue(true);
            mockGame.gridState.grid[0][1].object = undefined;

            const playerMovementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: true,
            };

            const result = service.teleportPlayer(mockGame, playerMovementInfo);
            expect(result).toBeUndefined();
        });

        it('should return undefined if tile has an invalid spawnpoint', () => {
            mockGame.gridState.grid[0][1].isTraversable = true;
            mockGame.isTileOccupied.mockReturnValue(false);
            mockGame.gridState.grid[0][1].spawnpoint = 'InvalidObject';

            const playerMovementInfo: PlayerMovementInfo = {
                gameId: 'game1',
                movingPlayerId: 'player1',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 0, y: 1 },
                isTeleporting: true,
            };

            const result = service.teleportPlayer(mockGame, playerMovementInfo);
            expect(result).toBeUndefined();
        });
    });

    describe('removePlayer', () => {
        it('should remove a player if player is present in a game', () => {
            service.removePlayer(mockedPlayers[0]._id);

            expect(mockGame.removePlayer).toHaveBeenCalledWith('player1');
        });

        it('should delete the game if no players are left', () => {
            mockGame.players = [mockedPlayers[0]];
            service.removePlayer(mockedPlayers[0]._id);

            expect(service.getGame('game1')).toBeUndefined();

            mockGame.players = [...mockedPlayers];
        });

        it('should do nothing if player is not found in any game', () => {
            jest.clearAllMocks();
            service.removePlayer('nonexistent');

            expect(mockGame.removePlayer).not.toHaveBeenCalled();
        });
    });
});
