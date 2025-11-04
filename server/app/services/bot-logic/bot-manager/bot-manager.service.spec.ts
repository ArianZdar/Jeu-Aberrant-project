import { FAKE_HUMAN_DELAY } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Lobby } from '@app/model/class/lobby/lobby';
import { BotBehaviorService } from '@app/services/bot-logic/bot-behavior/bot-behavior.service';
import { BotCreationService } from '@app/services/bot-logic/bot-creation/bot-creation.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { Teams } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { BotManagerService } from './bot-manager.service';

describe('BotManagerService', () => {
    let service: BotManagerService;
    let gameManagerService: jest.Mocked<GameManagerService>;
    let botCreationService: jest.Mocked<BotCreationService>;
    let botBehaviorService: jest.Mocked<BotBehaviorService>;
    let mockServer: jest.Mocked<Server>;

    const GAME_ID = 'test-game-id';
    const LOBBY_CODE = 'ABCD';
    const MAP_ID = 'map123';
    const MAX_PLAYERS = 4;
    const IS_LOCKED = false;
    const BOT_NAME = 'Bot 1';
    const PLAYER_ID = 'player1';
    const MIN_BOT_DELAY = 0;
    const MAX_POSSIBLE_DELAY = FAKE_HUMAN_DELAY;
    const DEFAULT_CHAMPION_INDEX = 0;
    const DEFAULT_HEALTH_POWER = 4;
    const DEFAULT_ATTACK_POWER = 4;
    const DEFAULT_DEFENSE_POWER = 6;
    const DEFAULT_SPEED = 6;
    const HALF_DELAY_MOCK_FACTOR = 0.5;

    const mockBot: Player = {
        _id: 'bot1',
        name: BOT_NAME,
        position: { x: 1, y: 1 },
        team: Teams.RedSide,
        isBot: true,
        isTurn: true,
    } as Player;

    const mockBotInfo: PlayerInfo = {
        _id: 'bot1',
        name: BOT_NAME,
        championIndex: DEFAULT_CHAMPION_INDEX,
        healthPower: DEFAULT_HEALTH_POWER,
        attackPower: DEFAULT_ATTACK_POWER,
        defensePower: DEFAULT_DEFENSE_POWER,
        speed: DEFAULT_SPEED,
        isReady: true,
        isAlive: true,
        isWinner: false,
        isDisconnected: false,
        isBot: true,
        isAggressive: false,
        isLeader: false,
    };

    const mockGame: Partial<Game> = {
        id: GAME_ID,
        players: [mockBot],
    };

    const mockLobby = new Lobby(MAP_ID, LOBBY_CODE, MAX_PLAYERS, IS_LOCKED);

    const hostPlayer: PlayerInfo = {
        _id: PLAYER_ID,
        name: 'Host Player',
        championIndex: 1,
        healthPower: DEFAULT_HEALTH_POWER,
        attackPower: DEFAULT_ATTACK_POWER,
        defensePower: DEFAULT_DEFENSE_POWER,
        speed: DEFAULT_SPEED,
        isReady: true,
        isAlive: true,
        isWinner: false,
        isDisconnected: false,
        isBot: false,
        isAggressive: false,
        isLeader: true,
    };
    mockLobby.addPlayer(hostPlayer);

    beforeEach(async () => {
        gameManagerService = {
            getGame: jest.fn().mockReturnValue(mockGame),
        } as unknown as jest.Mocked<GameManagerService>;

        botCreationService = {
            createBot: jest.fn().mockReturnValue(mockBotInfo),
        } as unknown as jest.Mocked<BotCreationService>;

        botBehaviorService = {
            setServer: jest.fn(),
            botBehavior: jest.fn(),
        } as unknown as jest.Mocked<BotBehaviorService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BotManagerService,
                { provide: GameManagerService, useValue: gameManagerService },
                { provide: BotCreationService, useValue: botCreationService },
                { provide: BotBehaviorService, useValue: botBehaviorService },
            ],
        }).compile();

        service = module.get<BotManagerService>(BotManagerService);
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
        it('should set server and propagate it to botBehaviorService', () => {
            service.setServer(mockServer);
            expect(botBehaviorService.setServer).toHaveBeenCalledWith(mockServer);
        });
    });

    describe('createBot', () => {
        it('should call botCreationService to create an aggressive bot', () => {
            const isAggressive = true;
            const result = service.createBot(mockLobby as Lobby, isAggressive);

            expect(botCreationService.createBot).toHaveBeenCalledWith(mockLobby, isAggressive);
            expect(result).toEqual(mockBotInfo);
        });

        it('should call botCreationService to create a defensive bot', () => {
            const isAggressive = false;
            const result = service.createBot(mockLobby as Lobby, isAggressive);

            expect(botCreationService.createBot).toHaveBeenCalledWith(mockLobby, isAggressive);
            expect(result).toEqual(mockBotInfo);
        });
    });

    describe('botTurn', () => {
        it('should get game and call botBehavior after timeout', () => {
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            service.botTurn(GAME_ID, mockBot);

            expect(gameManagerService.getGame).toHaveBeenCalledWith(GAME_ID);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(Number));

            const timeoutDelay = setTimeoutSpy.mock.calls[0][1] as number;
            expect(timeoutDelay).toBeGreaterThanOrEqual(MIN_BOT_DELAY);
            expect(timeoutDelay).toBeLessThanOrEqual(MAX_POSSIBLE_DELAY);

            jest.advanceTimersByTime(MAX_POSSIBLE_DELAY);

            expect(botBehaviorService.botBehavior).toHaveBeenCalledWith(mockGame, mockBot);

            setTimeoutSpy.mockRestore();
        });

        it('should not call botBehavior if game is not found', () => {
            gameManagerService.getGame.mockReturnValueOnce(null);

            service.botTurn(GAME_ID, mockBot);

            expect(gameManagerService.getGame).toHaveBeenCalledWith(GAME_ID);

            jest.advanceTimersByTime(MAX_POSSIBLE_DELAY);

            expect(botBehaviorService.botBehavior).not.toHaveBeenCalled();
        });

        it('should create a random delay between 0 and FAKE_HUMAN_DELAY', () => {
            const randomSpy = jest.spyOn(Math, 'random').mockReturnValueOnce(HALF_DELAY_MOCK_FACTOR);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            service.botTurn(GAME_ID, mockBot);

            const expectedDelay = FAKE_HUMAN_DELAY * HALF_DELAY_MOCK_FACTOR;
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), expectedDelay);

            randomSpy.mockRestore();
            setTimeoutSpy.mockRestore();
        });
    });
});
