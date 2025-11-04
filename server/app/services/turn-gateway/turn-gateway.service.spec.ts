import { Game } from '@app/model/class/game/game';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { Coordinate } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { TurnGatewayService } from './turn-gateway.service';

describe('TurnGatewayService', () => {
    let service: TurnGatewayService;
    let mockServer: Partial<Server>;

    let gameManagerServiceMock: Partial<GameManagerService>;
    let turnLogicServiceMock: Partial<TurnLogicService>;
    let botManagerServiceMock: Partial<BotManagerService>;

    const mockGameId = 'game-123';
    const mockPlayerId = 'player-123';
    const mockBotId = 'bot-123';

    const mockPosition: Coordinate = { x: 5, y: 5 };

    const mockPlayer: Partial<Player> = {
        _id: mockPlayerId,
        name: 'Test Player',
        position: mockPosition,
        isTurn: true,
        isBot: false,
        actionPoints: 2,
    };

    const mockBot: Partial<Player> = {
        _id: mockBotId,
        name: 'Bot Player',
        position: { x: 7, y: 7 },
        isTurn: false,
        isBot: true,
        actionPoints: 2,
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockPlayer as Player, mockBot as Player],
    };

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        gameManagerServiceMock = {
            getGame: jest.fn().mockReturnValue(mockGame),
        };

        turnLogicServiceMock = {
            startTurn: jest.fn(),
            endTurn: jest.fn(),
            nextTurn: jest.fn().mockReturnValue(mockBotId),
        };

        botManagerServiceMock = {
            botTurn: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TurnGatewayService,
                { provide: GameManagerService, useValue: gameManagerServiceMock },
                { provide: TurnLogicService, useValue: turnLogicServiceMock },
                { provide: BotManagerService, useValue: botManagerServiceMock },
            ],
        }).compile();

        service = module.get<TurnGatewayService>(TurnGatewayService);
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
            service.turnStart({ gameId: mockGameId, playerId: mockPlayerId });
            expect(newServer.to).toHaveBeenCalledWith(mockGameId);
            expect(newServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, mockPlayerId);
        });
    });

    describe('turnStart', () => {
        it('should start a turn and emit turn changed event', () => {
            const data = { gameId: mockGameId, playerId: mockPlayerId };

            service.turnStart(data);

            expect(turnLogicServiceMock.startTurn).toHaveBeenCalledWith(mockGameId, mockPlayerId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, mockPlayerId);
        });
    });

    describe('nextTurn', () => {
        it('should get next turn player and emit turn changed event', () => {
            service.nextTurn(mockGameId);

            expect(turnLogicServiceMock.nextTurn).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, mockBotId);
        });

        it('should not emit if game is not found', () => {
            gameManagerServiceMock.getGame = jest.fn().mockReturnValue(undefined);

            service.nextTurn(mockGameId);

            expect(turnLogicServiceMock.nextTurn).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, mockBotId);
            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
        });
    });

    describe('endTurn', () => {
        it('should end a player turn', () => {
            const data = { gameId: mockGameId, playerId: mockPlayerId };

            service.endTurn(data);

            expect(turnLogicServiceMock.endTurn).toHaveBeenCalledWith(mockGameId, mockPlayerId);
        });
    });

    describe('botTurn', () => {
        it('should trigger a bot turn when current player is a bot', () => {
            const gameWithBotTurn = {
                ...mockGame,
                players: [{ ...mockPlayer, isTurn: false } as Player, { ...mockBot, isTurn: true } as Player],
            };

            gameManagerServiceMock.getGame = jest.fn().mockReturnValue(gameWithBotTurn);

            service.botTurn({ gameId: mockGameId, playerId: mockBotId });

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(botManagerServiceMock.botTurn).toHaveBeenCalledWith(
                mockGameId,
                expect.objectContaining({
                    _id: mockBotId,
                    isBot: true,
                    isTurn: true,
                }),
            );
        });

        it('should not trigger a bot turn when current player is not a bot', () => {
            service.botTurn({ gameId: mockGameId, playerId: mockPlayerId });

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(botManagerServiceMock.botTurn).not.toHaveBeenCalled();
        });

        it('should not trigger a bot turn when game is not found', () => {
            gameManagerServiceMock.getGame = jest.fn().mockReturnValue(undefined);

            service.botTurn({ gameId: mockGameId, playerId: mockBotId });

            expect(gameManagerServiceMock.getGame).toHaveBeenCalledWith(mockGameId);
            expect(botManagerServiceMock.botTurn).not.toHaveBeenCalled();
        });
    });
});
