/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatGatewayService } from '@app/services/combat-gateway/combat-gateway.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameConnectionService } from '@app/services/game-connection/game-connection.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GridActionService } from '@app/services/grid-action/grid-action.service';
import { ItemManagerService } from '@app/services/item-manager/item-manager.service';
import { TurnGatewayService } from '@app/services/turn-gateway/turn-gateway.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameConfig } from '@common/game/game-config';
import { Coordinate } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { ChatMessage } from '@common/game/message';
import { PlayerMovementInfo } from '@common/player/player-movement-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { GameGateway } from './game.gateway';

describe('GameGateway', () => {
    let gateway: GameGateway;
    let mockServer: Partial<Server>;

    let baseGatewayServiceMock: Partial<BaseGatewayService>;
    let botManagerServiceMock: Partial<BotManagerService>;
    let chatServiceMock: Partial<ChatService>;
    let combatGatewayServiceMock: Partial<CombatGatewayService>;
    let combatLogicServiceMock: Partial<CombatLogicService>;
    let combatTurnLogicServiceMock: Partial<CombatTurnLogicService>;
    let gameConnectionServiceMock: Partial<GameConnectionService>;
    let gameManagerServiceMock: Partial<GameManagerService>;
    let gridActionServiceMock: Partial<GridActionService>;
    let itemManagerServiceMock: Partial<ItemManagerService>;
    let turnGatewayServiceMock: Partial<TurnGatewayService>;
    let turnLogicServiceMock: Partial<TurnLogicService>;
    let mockSocket: Partial<Socket>;

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        mockSocket = {
            id: 'test-socket-id',
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            rooms: new Set(['test-socket-id']),
        };

        baseGatewayServiceMock = {
            setServer: jest.fn(),
            addMessageToRoom: jest.fn(),
            getMessagesFromRoom: jest.fn(),
            handleDisconnect: jest.fn(),
        };

        botManagerServiceMock = {
            setServer: jest.fn(),
            botTurn: jest.fn(),
        };

        chatServiceMock = {
            setServer: jest.fn(),
            sendFirstTurnMessage: jest.fn(),
            handleRoomMessage: jest.fn(),
            handleChatHistory: jest.fn(),
        };

        combatGatewayServiceMock = {
            setServer: jest.fn(),
            startCombatLogic: jest.fn(),
            attemptEscape: jest.fn(),
            toggleDebugMode: jest.fn(),
            opponentDisconnected: jest.fn(),
        };

        combatLogicServiceMock = {
            setServer: jest.fn(),
        };

        combatTurnLogicServiceMock = {
            setServer: jest.fn(),
            endCombat: jest.fn(),
        };

        gameConnectionServiceMock = {
            setServer: jest.fn(),
            createGame: jest.fn(),
            joinGame: jest.fn(),
            getPlayers: jest.fn(),
            getMapId: jest.fn(),
            rebindSocketId: jest.fn(),
            leaveGame: jest.fn(),
            handleConnection: jest.fn(),
            handleDisconnect: jest.fn(),
        };

        gameManagerServiceMock = {
            findGameByPlayerId: jest.fn().mockReturnValue({
                id: 'test-game-id',
                players: [],
            }),
            playerIsAttacking: jest.fn(),
        };

        gridActionServiceMock = {
            setServer: jest.fn(),
            useDoor: jest.fn(),
            breakWall: jest.fn(),
            getAccessibleTiles: jest.fn(),
            movePlayer: jest.fn(),
            getShortestPathToTile: jest.fn(),
        };

        itemManagerServiceMock = {
            setServer: jest.fn(),
            getItems: jest.fn(),
            pickupItem: jest.fn(),
            dropItem: jest.fn(),
        };

        turnGatewayServiceMock = {
            setServer: jest.fn(),
            turnStart: jest.fn(),
            nextTurn: jest.fn(),
            endTurn: jest.fn(),
            botTurn: jest.fn(),
        };

        turnLogicServiceMock = {
            setServer: jest.fn(),
            pauseTurnTimer: jest.fn(),
            resumeTurnTimer: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                GameGateway,
                { provide: BaseGatewayService, useValue: baseGatewayServiceMock },
                { provide: BotManagerService, useValue: botManagerServiceMock },
                { provide: ChatService, useValue: chatServiceMock },
                { provide: CombatGatewayService, useValue: combatGatewayServiceMock },
                { provide: CombatLogicService, useValue: combatLogicServiceMock },
                { provide: CombatTurnLogicService, useValue: combatTurnLogicServiceMock },
                { provide: GameConnectionService, useValue: gameConnectionServiceMock },
                { provide: GameManagerService, useValue: gameManagerServiceMock },
                { provide: GridActionService, useValue: gridActionServiceMock },
                { provide: ItemManagerService, useValue: itemManagerServiceMock },
                { provide: TurnGatewayService, useValue: turnGatewayServiceMock },
                { provide: TurnLogicService, useValue: turnLogicServiceMock },
            ],
        }).compile();

        gateway = module.get<GameGateway>(GameGateway);

        gateway.server = mockServer as Server;
    });

    it('should be defined', () => {
        expect(gateway).toBeDefined();
    });

    describe('afterInit', () => {
        it('should set server for all services', () => {
            gateway.afterInit();

            expect(turnLogicServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(combatTurnLogicServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(botManagerServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(combatLogicServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(gridActionServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(chatServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(baseGatewayServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(combatGatewayServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(itemManagerServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(gameConnectionServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(turnGatewayServiceMock.setServer).toHaveBeenCalledWith(mockServer);
            expect(gridActionServiceMock.setServer).toHaveBeenCalledWith(mockServer);
        });
    });

    describe('startCombat', () => {
        it('should call combatGatewayService.startCombatLogic with correct parameters', async () => {
            const targetId = 'target-id';

            await gateway.startCombat(mockSocket as Socket, targetId);

            expect(combatGatewayServiceMock.startCombatLogic).toHaveBeenCalledWith(mockSocket.id, targetId);
        });
    });

    describe('sendFirstTurnMessage', () => {
        it('should call chatService.sendFirstTurnMessage with the game from gameManagerService', () => {
            const mockGame = { id: 'test-game-id', players: [] };
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(mockGame);

            gateway.sendFirstTurnMessage(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockSocket.id);
            expect(chatServiceMock.sendFirstTurnMessage).toHaveBeenCalledWith(mockGame);
        });
    });

    describe('botStartCombat', () => {
        it('should call combatGatewayService.startCombatLogic with bot and target IDs', () => {
            const data = { botId: 'bot-id', targetId: 'target-id' };

            gateway.botStartCombat(data);

            expect(combatGatewayServiceMock.startCombatLogic).toHaveBeenCalledWith(data.botId, data.targetId);
        });
    });

    describe('playerAttack', () => {
        it('should call gameManagerService.playerIsAttacking with correct parameters', async () => {
            const data = { isAnAutoAttack: false, targetId: 'target-id' };

            await gateway.playerAttack(mockSocket as Socket, data);

            expect(gameManagerServiceMock.playerIsAttacking).toHaveBeenCalledWith(mockSocket.id, data.targetId, data.isAnAutoAttack);
        });
    });

    describe('useDoor', () => {
        it('should call gridActionService.useDoor with correct parameters', async () => {
            const targetDoor: Coordinate = { x: 5, y: 5 };

            await gateway.useDoor(mockSocket as Socket, targetDoor);

            expect(gridActionServiceMock.useDoor).toHaveBeenCalledWith(mockSocket.id, targetDoor);
        });
    });

    describe('breakWall', () => {
        it('should call gridActionService.breakWall with correct parameters', async () => {
            const targetTile: Coordinate = { x: 3, y: 4 };

            await gateway.breakWall(mockSocket as Socket, targetTile);

            expect(gridActionServiceMock.breakWall).toHaveBeenCalledWith(mockSocket.id, targetTile);
        });
    });

    describe('createGame', () => {
        it('should call gameConnectionService.createGame with game config', async () => {
            const gameConfig: GameConfig = {
                id: 'game-id',
                mapId: 'map-id',
                players: [],
            };

            await gateway.createGame(gameConfig);

            expect(gameConnectionServiceMock.createGame).toHaveBeenCalledWith(gameConfig);
        });
    });

    describe('turnStart', () => {
        it('should call turnGatewayService.turnStart with correct data', () => {
            const data = { gameId: 'game-id', playerId: 'player-id' };

            gateway.turnStart(data);

            expect(turnGatewayServiceMock.turnStart).toHaveBeenCalledWith(data);
        });
    });

    describe('nextTurn', () => {
        it('should call turnGatewayService.nextTurn with gameId', () => {
            const gameId = 'game-id';

            gateway.nextTurn(gameId);

            expect(turnGatewayServiceMock.nextTurn).toHaveBeenCalledWith(gameId);
        });
    });

    describe('endTurn', () => {
        it('should call turnGatewayService.endTurn with correct data', () => {
            const data = { gameId: 'game-id', playerId: 'player-id' };

            gateway.endTurn(data);

            expect(turnGatewayServiceMock.endTurn).toHaveBeenCalledWith(data);
        });
    });

    describe('botTurn', () => {
        it('should call turnGatewayService.botTurn with correct data', () => {
            const data = { gameId: 'game-id', playerId: 'bot-id' };

            gateway.botTurn(data);

            expect(turnGatewayServiceMock.botTurn).toHaveBeenCalledWith(data);
        });
    });

    describe('joinGame', () => {
        it('should call gameConnectionService.joinGame with socket and gameId', () => {
            const gameId = 'game-id';

            gateway.joinGame(mockSocket as Socket, gameId);

            expect(gameConnectionServiceMock.joinGame).toHaveBeenCalledWith(mockSocket, gameId);
        });
    });

    describe('getPlayers', () => {
        it('should call gameConnectionService.getPlayers with socket', () => {
            gateway.getPlayers(mockSocket as Socket);

            expect(gameConnectionServiceMock.getPlayers).toHaveBeenCalledWith(mockSocket);
        });
    });

    describe('getItems', () => {
        it('should call itemManagerService.getItems with playerId', () => {
            gateway.getItems(mockSocket as Socket);

            expect(itemManagerServiceMock.getItems).toHaveBeenCalledWith(mockSocket.id);
        });
    });

    describe('pickupItem', () => {
        it('should call itemManagerService.pickupItem with playerId and itemPosition', () => {
            const itemPosition: Coordinate = { x: 2, y: 3 };

            gateway.pickupItem(mockSocket as Socket, itemPosition);

            expect(itemManagerServiceMock.pickupItem).toHaveBeenCalledWith(mockSocket.id, itemPosition);
        });
    });

    describe('dropItem', () => {
        it('should call itemManagerService.dropItem with playerId and gameItem', () => {
            const gameItem: GameItem = { position: { x: 0, y: 0 }, item: 'item' as any };

            gateway.dropItem(mockSocket as Socket, gameItem);

            expect(itemManagerServiceMock.dropItem).toHaveBeenCalledWith(mockSocket.id, gameItem);
        });
    });

    describe('getMapId', () => {
        it('should call gameConnectionService.getMapId with socket', () => {
            gateway.getMapId(mockSocket as Socket);

            expect(gameConnectionServiceMock.getMapId).toHaveBeenCalledWith(mockSocket);
        });
    });

    describe('getAccessibleTiles', () => {
        it('should call gridActionService.getAccessibleTiles with playerId', () => {
            gateway.getAccessibleTiles(mockSocket as Socket);

            expect(gridActionServiceMock.getAccessibleTiles).toHaveBeenCalledWith(mockSocket.id);
        });
    });

    describe('movePlayer', () => {
        it('should call gridActionService.movePlayer with movement info', () => {
            const movementInfo: PlayerMovementInfo = {
                gameId: 'game-id',
                movingPlayerId: 'player-id',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 1, y: 1 },
            };

            gateway.movePlayer(movementInfo);

            expect(gridActionServiceMock.movePlayer).toHaveBeenCalledWith(movementInfo);
        });
    });

    describe('getShortestPathToTile', () => {
        it('should call gridActionService.getShortestPathToTile with correct data', () => {
            const data = {
                gameId: 'game-id',
                playerId: 'player-id',
                destination: { x: 5, y: 5 },
            };

            gateway.getShortestPathToTile(data);

            expect(gridActionServiceMock.getShortestPathToTile).toHaveBeenCalledWith(data);
        });
    });

    describe('leaveGame', () => {
        it('should call gameConnectionService.leaveGame with socket', () => {
            gateway.leaveGame(mockSocket as Socket);

            expect(gameConnectionServiceMock.leaveGame).toHaveBeenCalledWith(mockSocket);
        });
    });

    describe('attemptEscape', () => {
        it('should call combatGatewayService.attemptEscape with playerId and targetId', () => {
            const targetId = 'target-id';

            gateway.attemptEscape(mockSocket as Socket, targetId);

            expect(combatGatewayServiceMock.attemptEscape).toHaveBeenCalledWith(mockSocket.id, targetId);
        });
    });

    describe('rebindSocketId', () => {
        it('should call gameConnectionService.rebindSocketId with socket IDs', () => {
            const data = { lobbySocketId: 'lobby-id', gameSocketId: 'game-id' };

            gateway.rebindSocketId(data);

            expect(gameConnectionServiceMock.rebindSocketId).toHaveBeenCalledWith(data);
        });
    });

    describe('endCombat', () => {
        it('should call combatTurnLogicService.endCombat with gameId', () => {
            const gameId = 'game-id';

            gateway.endCombat(gameId);

            expect(combatTurnLogicServiceMock.endCombat).toHaveBeenCalledWith(gameId);
        });
    });

    describe('pauseTurnTimer', () => {
        it('should call turnLogicService.pauseTurnTimer with gameId', () => {
            const gameId = 'game-id';

            gateway.pauseTurnTimer(gameId);

            expect(turnLogicServiceMock.pauseTurnTimer).toHaveBeenCalledWith(gameId);
        });
    });

    describe('resumeTurnTimer', () => {
        it('should call turnLogicService.resumeTurnTimer with gameId', () => {
            const gameId = 'game-id';

            gateway.resumeTurnTimer(gameId);

            expect(turnLogicServiceMock.resumeTurnTimer).toHaveBeenCalledWith(gameId);
        });
    });

    describe('toggleDebugMode', () => {
        it('should call combatGatewayService.toggleDebugMode with socket', () => {
            gateway.toggleDebugMode(mockSocket as Socket);

            expect(combatGatewayServiceMock.toggleDebugMode).toHaveBeenCalledWith(mockSocket);
        });
    });

    describe('opponentDisconnected', () => {
        it('should call combatGatewayService.opponentDisconnected with playerId', () => {
            gateway.opponentDisconnected(mockSocket as Socket);

            expect(combatGatewayServiceMock.opponentDisconnected).toHaveBeenCalledWith(mockSocket.id);
        });
    });

    describe('handleRoomMessage', () => {
        it('should call chatService.handleRoomMessage with game and message', () => {
            const message: ChatMessage = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'Test Player',
                senderId: 'player-id',
                content: 'Hello world',
            };
            const mockGame = { id: 'test-game-id', players: [] };
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(mockGame);

            gateway.handleRoomMessage(mockSocket as Socket, message);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockSocket.id);
            expect(chatServiceMock.handleRoomMessage).toHaveBeenCalledWith(mockGame, message);
        });
    });

    describe('handleChatHistory', () => {
        it('should call chatService.handleChatHistory with socket and lobbyId data', () => {
            const lobbyId = 'lobby-id';

            gateway.handleChatHistory(mockSocket as Socket, lobbyId);

            expect(chatServiceMock.handleChatHistory).toHaveBeenCalledWith(mockSocket, lobbyId);
        });
    });

    describe('handleConnection', () => {
        it('should call gameConnectionService.handleConnection with socket', () => {
            gateway.handleConnection(mockSocket as Socket);

            expect(gameConnectionServiceMock.handleConnection).toHaveBeenCalledWith(mockSocket);
        });
    });

    describe('handleDisconnect', () => {
        it('should call gameConnectionService.handleDisconnect with socket', () => {
            gateway.handleDisconnect(mockSocket as Socket);

            expect(gameConnectionServiceMock.handleDisconnect).toHaveBeenCalledWith(mockSocket);
        });
    });
});
