import { BOT_NAME, CHAMPIONS, COIN_FLIP_PROBABILITY, MAX_POWER, MIN_POWER } from '@app/constants/server-constants';
import { Lobby } from '@app/model/class/lobby/lobby';
import { BotCreationService } from '@app/services/bot-logic/bot-creation/bot-creation.service';
import { PlayerInfo } from '@common/player/player-info';
import { Test, TestingModule } from '@nestjs/testing';

describe('BotCreationService', () => {
    let service: BotCreationService;

    const mockLobbyId = 'test-lobby-id';
    const mockPlayerInfo: PlayerInfo = {
        _id: 'player1',
        name: 'Human Player',
        championIndex: 0,
        healthPower: 4,
        attackPower: 6,
        defensePower: 4,
        speed: 6,
        isReady: true,
        isAlive: true,
        isWinner: false,
        isDisconnected: false,
        isBot: false,
        isAggressive: false,
        isLeader: true,
    };

    const mockLobby = {
        id: mockLobbyId,
        getPlayers: jest.fn().mockReturnValue([mockPlayerInfo]),
    } as unknown as jest.Mocked<Lobby>;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotCreationService],
        }).compile();

        service = module.get<BotCreationService>(BotCreationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createBot', () => {
        it('should create an aggressive bot with valid properties', () => {
            const result = service.createBot(mockLobby, true);

            expect(result._id).toContain('bot-');
            expect(BOT_NAME).toContain(result.name);
            expect(result.championIndex).toBeGreaterThanOrEqual(0);
            expect(result.championIndex).toBeLessThan(CHAMPIONS.length);
            expect([MIN_POWER, MAX_POWER]).toContain(result.healthPower);
            expect([MIN_POWER, MAX_POWER]).toContain(result.attackPower);
            expect([MIN_POWER, MAX_POWER]).toContain(result.defensePower);
            expect([MIN_POWER, MAX_POWER]).toContain(result.speed);
            expect(result.isReady).toBe(true);
            expect(result.isAlive).toBe(true);
            expect(result.isWinner).toBe(false);
            expect(result.isDisconnected).toBe(false);
            expect(result.isBot).toBe(true);
            expect(result.isAggressive).toBe(true);
            expect(result.isLeader).toBe(false);
        });

        it('should create a defensive bot with valid properties', () => {
            const result = service.createBot(mockLobby, false);

            expect(result.isAggressive).toBe(false);

            expect(result._id).toContain('bot-');
            expect(BOT_NAME).toContain(result.name);
            expect(result.isBot).toBe(true);
        });

        it('should ensure bot has a unique name', () => {
            const botWithName = {
                ...mockPlayerInfo,
                name: BOT_NAME[0],
            };

            const lobbyWithBot = {
                ...mockLobby,
                getPlayers: jest.fn().mockReturnValue([mockPlayerInfo, botWithName]),
            } as unknown as jest.Mocked<Lobby>;

            const randomSpy = jest.spyOn(Math, 'random');
            randomSpy.mockReturnValueOnce(0);
            randomSpy.mockReturnValueOnce(COIN_FLIP_PROBABILITY);

            const result = service.createBot(lobbyWithBot, true);

            expect(result.name).not.toBe(BOT_NAME[0]);

            randomSpy.mockRestore();
        });
    });
});
