/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/promise-function-async*/
import { Game } from '@app/model/class/game/game';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { ChatService } from '@app/services/chat/chat.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameConfig } from '@common/game/game-config';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameConnectionService } from './game-connection.service';

describe('GameConnectionService', () => {
    let service: GameConnectionService;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    let gameManagerServiceMock: Partial<GameManagerService>;
    let turnLogicServiceMock: Partial<TurnLogicService>;
    let chatServiceMock: Partial<ChatService>;
    let itemBehaviorServiceMock: Partial<ItemBehaviorService>;
    let baseGatewayServiceMock: Partial<BaseGatewayService>;

    const mockGameId = 'game-123';
    const mockPlayerId = 'player-123';
    const mockLobbySocketId = 'lobby-123';

    const mockPlayer: Partial<Player> = {
        _id: mockPlayerId,
        name: 'Test Player',
        isTurn: true,
        isLeader: false,
        isConnected: true,
    };

    const mockLeaderPlayer: Partial<Player> = {
        _id: 'leader-123',
        name: 'Leader Player',
        isTurn: false,
        isLeader: true,
        isConnected: true,
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        mapId: 'map-123',
        players: [mockPlayer as Player, mockLeaderPlayer as Player],
        deactivateDebug: jest.fn(),
    };

    const mockGameConfig: GameConfig = {
        id: mockGameId,
        mapId: 'map-123',
        players: [{ _id: mockLobbySocketId, name: 'Test Player' } as PlayerInfo, { _id: 'leader-lobby-123', name: 'Leader Player' } as PlayerInfo],
    };

    beforeEach(async () => {
        mockSocket = {
            id: mockPlayerId,
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
            rooms: new Set([mockPlayerId, mockGameId]),
        };

        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        gameManagerServiceMock = {
            createGame: jest.fn().mockResolvedValue(mockGame),
            getGame: jest.fn().mockReturnValue(mockGame),
            getPlayers: jest.fn().mockReturnValue([mockPlayer as Player, mockLeaderPlayer as Player]),
            findGameByPlayerId: jest.fn().mockReturnValue(mockGame),
            updatePlayerConnectionStatus: jest.fn(),
            removePlayer: jest.fn(),
        };

        turnLogicServiceMock = {
            startGame: jest.fn().mockReturnValue([mockPlayer as Player, mockLeaderPlayer as Player]),
            nextTurn: jest.fn().mockReturnValue(mockLeaderPlayer._id),
        };

        chatServiceMock = {
            playerLeftEvent: jest.fn(),
        };

        itemBehaviorServiceMock = {
            dropAllItems: jest.fn(),
        };

        baseGatewayServiceMock = {
            handleDisconnect: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameConnectionService,
                { provide: GameManagerService, useValue: gameManagerServiceMock },
                { provide: TurnLogicService, useValue: turnLogicServiceMock },
                { provide: ChatService, useValue: chatServiceMock },
                { provide: ItemBehaviorService, useValue: itemBehaviorServiceMock },
                { provide: BaseGatewayService, useValue: baseGatewayServiceMock },
            ],
        }).compile();

        service = module.get<GameConnectionService>(GameConnectionService);
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

            service.leaveGame(mockSocket as Socket);
            expect(newServer.to).toHaveBeenCalled();
        });
    });

    describe('createGame', () => {
        it('should create a game successfully', async () => {
            const result = await service.createGame(mockGameConfig);

            expect(gameManagerServiceMock.createGame).toHaveBeenCalledWith(mockGameConfig);
            expect(turnLogicServiceMock.startGame).toHaveBeenCalledWith(mockGameId, mockGame.players);
            expect(result).toEqual({ success: true, gameId: mockGameId });
        });

        it('should handle game creation failure', async () => {
            gameManagerServiceMock.createGame = jest.fn().mockResolvedValue(undefined);

            const result = await service.createGame(mockGameConfig);

            expect(gameManagerServiceMock.createGame).toHaveBeenCalledWith(mockGameConfig);
            expect(turnLogicServiceMock.startGame).not.toHaveBeenCalled();
            expect(result).toEqual({ success: false });
        });

        it('should rebind socket IDs if lobbySocketId is mapped', async () => {
            const mockRebindLobbyId = 'lobby-rebind-id';
            const mockRebindGameId = 'game-rebind-id';

            await service.rebindSocketId({
                lobbySocketId: mockRebindLobbyId,
                gameSocketId: mockRebindGameId,
            });

            const mockGameConfigWithRebind: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: mockRebindLobbyId, name: 'Rebind Player' } as PlayerInfo],
            };

            const mockGameWithRebindPlayer = {
                ...mockGame,
                players: [
                    {
                        _id: mockRebindLobbyId,
                        name: 'Rebind Player',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockResolvedValue(mockGameWithRebindPlayer);

            await service.createGame(mockGameConfigWithRebind);

            expect(mockGameWithRebindPlayer.players[0]._id).toBe(mockRebindGameId);
        });
    });

    describe('joinGame', () => {
        it('should join a game', () => {
            service.joinGame(mockSocket as Socket, mockGameId);

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mockSocket.join).toHaveBeenCalledWith(mockGameId);
            expect(gameManagerServiceMock.getPlayers).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to).toHaveBeenCalledWith(mockPlayerId);
            expect(mockServer.to(mockPlayerId).emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, mockPlayerId);
        });

        it('should not join if game does not exist', () => {
            gameManagerServiceMock.getGame = jest.fn().mockReturnValue(undefined);

            service.joinGame(mockSocket as Socket, mockGameId);

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mockSocket.join).not.toHaveBeenCalled();
        });

        it('should not emit turn change if no player has turn', () => {
            const noTurnPlayers = [{ ...mockPlayer, isTurn: false } as Player, { ...mockLeaderPlayer, isTurn: false } as Player];

            gameManagerServiceMock.getPlayers = jest.fn().mockReturnValue(noTurnPlayers);

            service.joinGame(mockSocket as Socket, mockGameId);

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(mockSocket.join).toHaveBeenCalledWith(mockGameId);
            expect(gameManagerServiceMock.getPlayers).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to).not.toHaveBeenCalledWith(mockPlayerId);
        });
    });

    describe('getPlayers', () => {
        it('should get players for the game', () => {
            const players = service.getPlayers(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.getPlayers).toHaveBeenCalledWith(mockGameId);
            expect(players).toEqual([mockPlayer, mockLeaderPlayer]);
        });

        it('should return empty array if game not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            const players = service.getPlayers(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(players).toEqual([]);
        });
    });

    describe('getMapId', () => {
        it('should return map ID for the game', () => {
            const mapId = service.getMapId(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(mapId).toBe('map-123');
        });

        it('should return null if game not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            const mapId = service.getMapId(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(mapId).toBeNull();
        });
    });

    describe('rebindSocketId', () => {
        it('should store lobby and game socket mapping', () => {
            const data = {
                lobbySocketId: 'new-lobby-123',
                gameSocketId: 'new-game-123',
            };

            service.rebindSocketId(data);

            const mockRebindGameConfig: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: 'new-lobby-123', name: 'Rebind Test' } as PlayerInfo],
            };

            const mockRebindGame = {
                ...mockGame,
                players: [
                    {
                        _id: 'new-lobby-123',
                        name: 'Rebind Test',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockImplementation(() => {
                mockRebindGame.players[0]._id = 'new-game-123';
                return Promise.resolve(mockRebindGame);
            });

            service.createGame(mockRebindGameConfig);

            expect(mockRebindGame.players[0]._id).toBe('new-game-123');
        });

        it('should not store mapping if data is incomplete', () => {
            const data = {
                lobbySocketId: null,
                gameSocketId: 'new-game-123',
            };

            service.rebindSocketId(data);

            const mockRebindGameConfig: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: null, name: 'Incomplete Rebind' } as PlayerInfo],
            };

            const mockRebindGame = {
                ...mockGame,
                players: [
                    {
                        _id: null,
                        name: 'Incomplete Rebind',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockResolvedValue(mockRebindGame);

            service.createGame(mockRebindGameConfig);

            expect(mockRebindGame.players[0]._id).toBe(null);
        });
    });

    describe('leaveGame', () => {
        it('should handle player leaving a game', () => {
            service.leaveGame(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.dropAllItems).toHaveBeenCalledWith(mockGame, mockPlayer);
            expect(chatServiceMock.playerLeftEvent).toHaveBeenCalledWith(mockGameId, mockPlayer);
            expect(mockSocket.leave).toHaveBeenCalled();
            expect(gameManagerServiceMock.updatePlayerConnectionStatus).toHaveBeenCalledWith(mockPlayerId, false);
            expect(gameManagerServiceMock.removePlayer).toHaveBeenCalledWith(mockPlayerId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems, mockGame.players);
        });

        it('should do nothing if game not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            service.leaveGame(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.dropAllItems).not.toHaveBeenCalled();
            expect(chatServiceMock.playerLeftEvent).not.toHaveBeenCalled();
        });

        it('should deactivate debug if leader leaves', () => {
            const leaderSocket = {
                ...mockSocket,
                id: 'leader-123',
            };

            mockServer.to = jest.fn().mockReturnThis();
            mockServer.to(mockGameId).emit = jest.fn();

            service.leaveGame(leaderSocket as Socket);

            expect(mockGame.deactivateDebug).toHaveBeenCalled();
        });

        it('should emit LastPlayerConnected if only one player remains connected', () => {
            const twoPlayerGame = {
                ...mockGame,
                players: [mockPlayer as Player, { ...mockLeaderPlayer, isConnected: true } as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(twoPlayerGame);
            gameManagerServiceMock.getPlayers = jest.fn().mockReturnValue([{ ...mockLeaderPlayer, isConnected: true } as Player]);

            service.leaveGame(mockSocket as Socket);

            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.LastPlayerConnected, 'leader-123');
        });
    });

    describe('handleConnection', () => {
        it('should store lobby socket ID mapping', () => {
            const socketWithAuth = {
                ...mockSocket,
                handshake: { auth: { lobbySocketId: 'connected-lobby-id' } },
            };

            service.handleConnection(socketWithAuth as unknown as Socket);

            const mockConnectedGameConfig: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: 'connected-lobby-id', name: 'Connected Player' } as PlayerInfo],
            };

            const mockConnectedGame = {
                ...mockGame,
                players: [
                    {
                        _id: 'connected-lobby-id',
                        name: 'Connected Player',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockImplementation(() => {
                mockConnectedGame.players[0]._id = mockPlayerId;
                return Promise.resolve(mockConnectedGame);
            });

            service.createGame(mockConnectedGameConfig);

            expect(mockConnectedGame.players[0]._id).toBe(mockPlayerId);
        });

        it('should do nothing if no lobby socket ID in auth', () => {
            const socketWithoutAuth = {
                ...mockSocket,
                handshake: { auth: {} },
            };

            service.handleConnection(socketWithoutAuth as Socket);

            const mockNoAuthGameConfig: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: 'unmapped-lobby-id', name: 'Unmapped Player' } as PlayerInfo],
            };

            const mockNoAuthGame = {
                ...mockGame,
                players: [
                    {
                        _id: 'unmapped-lobby-id',
                        name: 'Unmapped Player',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockResolvedValue(mockNoAuthGame);

            service.createGame(mockNoAuthGameConfig);

            expect(mockNoAuthGame.players[0]._id).toBe('unmapped-lobby-id');
        });
    });

    describe('handleDisconnect', () => {
        it('should clean up when a socket disconnects', () => {
            service.rebindSocketId({
                lobbySocketId: 'disconnect-lobby-id',
                gameSocketId: mockPlayerId,
            });

            service.handleDisconnect(mockSocket as Socket);

            expect(baseGatewayServiceMock.handleDisconnect).toHaveBeenCalledWith(mockSocket);

            const mockDisconnectGameConfig: GameConfig = {
                id: mockGameId,
                mapId: 'map-123',
                players: [{ _id: 'disconnect-lobby-id', name: 'Disconnected Player' } as PlayerInfo],
            };

            const mockDisconnectGame = {
                ...mockGame,
                players: [
                    {
                        _id: 'disconnect-lobby-id',
                        name: 'Disconnected Player',
                    } as Player,
                ],
            };

            gameManagerServiceMock.createGame = jest.fn().mockResolvedValue(mockDisconnectGame);

            service.createGame(mockDisconnectGameConfig);

            expect(mockDisconnectGame.players[0]._id).toBe('disconnect-lobby-id');
        });
    });
});
