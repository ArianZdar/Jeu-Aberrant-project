/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ATTACK_DELAY_FOR_BOTS, BotBehaviorContext } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { BotCombatService } from '@app/services/bot-logic/bot-combat/bot-combat.service';
import { BotItemService } from '@app/services/bot-logic/bot-item/bot-item.service';
import { BotMovementService } from '@app/services/bot-logic/bot-movement/bot-movement.service';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameModes, GameObjects, Teams } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { BotBehaviorService } from './bot-behavior.service';

describe('BotBehaviorService', () => {
    let service: BotBehaviorService;
    let turnLogicService: jest.Mocked<TurnLogicService>;
    let botCombatService: jest.Mocked<BotCombatService>;
    let botMovementService: jest.Mocked<BotMovementService>;
    let botItemService: jest.Mocked<BotItemService>;
    let botUtilsService: jest.Mocked<BotUtilsService>;
    let gameManagerService: jest.Mocked<GameManagerService>;
    let mockServer: jest.Mocked<Server>;

    const mockGameId = 'test-game-id';

    const mockBot: Player = {
        _id: 'bot1',
        name: 'Bot 1',
        position: { x: 1, y: 1 },
        spawnPointPosition: { x: 0, y: 0 },
        team: Teams.RedSide,
        isBot: true,
        isTurn: true,
        hasFlag: false,
        isInCombat: false,
        isAggressive: true,
        actionPoints: 1,
        items: [],
    } as Player;

    const mockEnemy: Player = {
        _id: 'enemy1',
        name: 'Enemy 1',
        position: { x: 3, y: 3 },
        spawnPointPosition: { x: 5, y: 5 },
        team: Teams.BlueSide,
        isBot: false,
        isTurn: false,
        hasFlag: false,
        isInCombat: false,
        isAggressive: false,
    } as Player;

    const mockEnemies: Player[] = [mockEnemy];

    const mockItemObject = GameObjects.SwiftnessBoots;

    const mockClosestItem = {
        position: { x: 2, y: 2 },
        item: mockItemObject,
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockBot, ...mockEnemies],
        gameMode: GameModes.Classic,
    };

    const mockAccessibleTiles: Coordinate[] = [
        { x: 1, y: 2 },
        { x: 2, y: 1 },
        { x: 0, y: 1 },
    ];

    const mockBotBehaviorContext: BotBehaviorContext = {
        game: mockGame as Game,
        bot: mockBot,
        enemies: mockEnemies,
        closestEnemy: mockEnemy,
        closestItem: mockClosestItem,
        itemInRange: false,
        enemyInRange: false,
    };

    beforeEach(async () => {
        turnLogicService = {
            endBotTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        botCombatService = {
            setServer: jest.fn(),
            attackEnemy: jest.fn(),
            findClosestEnemy: jest.fn().mockReturnValue(mockEnemy),
            tryToAttackEnemy: jest.fn(),
        } as unknown as jest.Mocked<BotCombatService>;

        botMovementService = {
            setServer: jest.fn(),
            moveTowardsTargetAndShouldRecallBotBehavior: jest.fn(),
            isPositionInAccessibleTiles: jest.fn(),
            isSamePosition: jest.fn(),
        } as unknown as jest.Mocked<BotMovementService>;

        botItemService = {
            findClosestItemByCategory: jest.fn().mockReturnValue(mockClosestItem),
            findFlagPosition: jest.fn(),
        } as unknown as jest.Mocked<BotItemService>;

        botUtilsService = {
            getAliveEnemies: jest.fn().mockReturnValue(mockEnemies),
            canAttackEnemyFromThatTile: jest.fn(),
        } as unknown as jest.Mocked<BotUtilsService>;

        gameManagerService = {
            getAccessibleTileForPlayer: jest.fn().mockReturnValue(mockAccessibleTiles),
        } as unknown as jest.Mocked<GameManagerService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BotBehaviorService,
                { provide: TurnLogicService, useValue: turnLogicService },
                { provide: BotCombatService, useValue: botCombatService },
                { provide: BotMovementService, useValue: botMovementService },
                { provide: BotItemService, useValue: botItemService },
                { provide: BotUtilsService, useValue: botUtilsService },
                { provide: GameManagerService, useValue: gameManagerService },
            ],
        }).compile();

        service = module.get<BotBehaviorService>(BotBehaviorService);
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
        it('should set server and propagate it to child services', () => {
            service.setServer(mockServer);
            expect(botCombatService.setServer).toHaveBeenCalledWith(mockServer);
            expect(botMovementService.setServer).toHaveBeenCalledWith(mockServer);
        });
    });

    describe('botBehavior', () => {
        it('should return early if no closest item and no closest enemy', () => {
            botItemService.findClosestItemByCategory.mockReturnValueOnce(null);
            botCombatService.findClosestEnemy.mockReturnValueOnce(null);
            service.botBehavior(mockGame as Game, mockBot);
            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(mockGame, mockBot);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(mockGame, mockBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
        });

        it('should return early if bot is not its turn', () => {
            const notTurnBot = { ...mockBot, isTurn: false };
            service.botBehavior(mockGame as Game, notTurnBot);
            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(mockGame, notTurnBot);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(mockGame, notTurnBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(mockGame, notTurnBot, mockEnemies);
        });

        it('should return early if bot is in combat', () => {
            const inCombatBot = { ...mockBot, isInCombat: true };
            service.botBehavior(mockGame as Game, inCombatBot);
            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(mockGame, inCombatBot);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(mockGame, inCombatBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(mockGame, inCombatBot, mockEnemies);
        });

        it('should call ctfBotBehavior if game mode is CTF', () => {
            const ctfGame = { ...mockGame, gameMode: GameModes.CTF };
            const ctfBotBehaviorSpy = jest.spyOn(service as any, 'ctfBotBehavior');
            service.botBehavior(ctfGame as Game, mockBot);
            expect(ctfBotBehaviorSpy).toHaveBeenCalledWith(ctfGame, mockBot, mockEnemies);
            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(ctfGame, mockBot);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(ctfGame, mockBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(ctfGame, mockBot, mockEnemies);
        });

        it('should call defaultBotBehavior if game mode is not CTF', () => {
            const classicGame = { ...mockGame, gameMode: GameModes.Classic };
            const defaultBotBehaviorSpy = jest.spyOn(service as any, 'defaultBotBehavior');
            service.botBehavior(classicGame as Game, mockBot);
            expect(defaultBotBehaviorSpy).toHaveBeenCalledWith(classicGame, mockBot, mockEnemies);
            expect(botUtilsService.getAliveEnemies).toHaveBeenCalledWith(classicGame, mockBot);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(classicGame, mockBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(classicGame, mockBot, mockEnemies);
        });
    });

    describe('moveAndAttackEnemy', () => {
        const target: Coordinate = { x: 2, y: 2 };

        it('should not move if bot is in combat', async () => {
            const inCombatBot = { ...mockBot, isInCombat: true };
            const promise = service['moveAndAttackEnemy'](mockGame as Game, inCombatBot, mockEnemies, target, false);
            expect(botCombatService.attackEnemy).toHaveBeenCalledWith(mockGame, inCombatBot, mockEnemies);
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            const result = await promise;
            expect(result).toBe(false);
            expect(botMovementService.moveTowardsTargetAndShouldRecallBotBehavior).not.toHaveBeenCalled();
        });

        it('should attack enemy and move towards target', async () => {
            botMovementService.moveTowardsTargetAndShouldRecallBotBehavior.mockResolvedValueOnce(false);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            const promise = service['moveAndAttackEnemy'](mockGame as Game, mockBot, mockEnemies, target, false);
            expect(botCombatService.attackEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            const result = await promise;
            expect(botMovementService.moveTowardsTargetAndShouldRecallBotBehavior).toHaveBeenCalledWith(mockGame, mockBot, target, false);
            expect(result).toBe(false);
            setTimeoutSpy.mockRestore();
        });

        it('should return shouldRecallBotBehavior value from moveTowardsTarget', async () => {
            botMovementService.moveTowardsTargetAndShouldRecallBotBehavior.mockResolvedValueOnce(true);
            const promise = service['moveAndAttackEnemy'](mockGame as Game, mockBot, mockEnemies, target, true);
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            const result = await promise;
            expect(result).toBe(true);
        });
    });

    describe('ctfBotBehavior', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'moveAndAttackEnemy').mockImplementation(async () => false);
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            jest.spyOn(service as any, 'moveAndAttackEnemy').mockResolvedValueOnce(true);

            await service['ctfBotBehavior'](mockGame as Game, mockBot, mockEnemies);

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);

            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);

            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const flagPosition: Coordinate = { x: 4, y: 4 };
            botItemService.findFlagPosition.mockReturnValueOnce(flagPosition);
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            const moveAndAttackSpy = jest.spyOn(service as any, 'moveAndAttackEnemy').mockImplementationOnce(async () => {
                setTimeout(() => {
                    service.botBehavior(mockGame as Game, mockBot);
                }, ATTACK_DELAY_FOR_BOTS);
                return true;
            });
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            await service['ctfBotBehavior'](mockGame as Game, mockBot, mockEnemies);
            expect(moveAndAttackSpy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, flagPosition, false);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).not.toHaveBeenCalled();
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);
            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
            moveAndAttackSpy.mockRestore();
        });

        it('should move towards flag if flag position exists', async () => {
            const flagPosition: Coordinate = { x: 4, y: 4 };
            botItemService.findFlagPosition.mockReturnValueOnce(flagPosition);
            await service['ctfBotBehavior'](mockGame as Game, mockBot, mockEnemies);
            expect(botItemService.findFlagPosition).toHaveBeenCalledWith(mockGame);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, flagPosition, false);
        });

        it('should move towards spawn point if bot has flag', async () => {
            const botWithFlag = { ...mockBot, hasFlag: true };
            await service['ctfBotBehavior'](mockGame as Game, botWithFlag, mockEnemies);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithFlag, mockEnemies, botWithFlag.spawnPointPosition, false);
        });

        it('should move towards enemy with flag if bot is aggressive', async () => {
            const enemyWithFlag = { ...mockEnemy, hasFlag: true };
            const aggressiveBot = { ...mockBot, isAggressive: true };
            await service['ctfBotBehavior'](mockGame as Game, aggressiveBot, [enemyWithFlag]);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, aggressiveBot, [enemyWithFlag], enemyWithFlag.position, false);
        });

        it('should move towards enemy spawn point if bot is defensive and enemy has flag', async () => {
            const enemyWithFlag = { ...mockEnemy, hasFlag: true };
            const defensiveBot = { ...mockBot, isAggressive: false };
            botMovementService.isSamePosition.mockReturnValueOnce(false);
            await service['ctfBotBehavior'](mockGame as Game, defensiveBot, [enemyWithFlag]);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(
                mockGame,
                defensiveBot,
                [enemyWithFlag],
                enemyWithFlag.spawnPointPosition,
                false,
            );
        });

        it('should end turn if defensive bot is at enemy spawn point', async () => {
            const enemyWithFlag = { ...mockEnemy, hasFlag: true };
            const defensiveBot = { ...mockBot, isAggressive: false };
            botMovementService.isSamePosition.mockReturnValueOnce(true);
            await service['ctfBotBehavior'](mockGame as Game, defensiveBot, [enemyWithFlag]);
            expect(botMovementService.isSamePosition).toHaveBeenCalledWith(enemyWithFlag.spawnPointPosition, defensiveBot.position);
            expect(turnLogicService.endBotTurn).toHaveBeenCalledWith(mockGameId);
        });

        it('should fall back to defaultBotBehavior if no special conditions are met', async () => {
            const defaultBotBehaviorSpy = jest.spyOn(service as any, 'defaultBotBehavior');
            await service['ctfBotBehavior'](mockGame as Game, mockBot, mockEnemies);
            expect(defaultBotBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
        });
    });

    describe('defaultBotBehavior', () => {
        it('should check for accessible tiles and closest items/enemies', () => {
            const handleAggressiveBotBehaviorSpy = jest.spyOn(service as any, 'handleAggressiveBotBehavior');
            service['defaultBotBehavior'](mockGame as Game, mockBot, mockEnemies);
            expect(gameManagerService.getAccessibleTileForPlayer).toHaveBeenCalledWith(mockGameId, mockBot._id);
            expect(botItemService.findClosestItemByCategory).toHaveBeenCalledWith(mockGame, mockBot);
            expect(botCombatService.findClosestEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
            expect(botMovementService.isPositionInAccessibleTiles).toHaveBeenCalledWith(mockClosestItem.position, mockAccessibleTiles);
            expect(handleAggressiveBotBehaviorSpy).toHaveBeenCalled();
        });

        it('should call handleAggressiveBotBehavior for aggressive bots', () => {
            const aggressiveBot = { ...mockBot, isAggressive: true };
            const handleAggressiveBotBehaviorSpy = jest.spyOn(service as any, 'handleAggressiveBotBehavior');
            service['defaultBotBehavior'](mockGame as Game, aggressiveBot, mockEnemies);
            expect(handleAggressiveBotBehaviorSpy).toHaveBeenCalled();
        });

        it('should call handleDefensiveBotBehavior for defensive bots', () => {
            const defensiveBot = { ...mockBot, isAggressive: false };
            const handleDefensiveBotBehaviorSpy = jest.spyOn(service as any, 'handleDefensiveBotBehavior');
            service['defaultBotBehavior'](mockGame as Game, defensiveBot, mockEnemies);
            expect(handleDefensiveBotBehaviorSpy).toHaveBeenCalled();
        });

        it('should check if enemy can be attacked from accessible tiles', () => {
            botUtilsService.canAttackEnemyFromThatTile.mockReturnValueOnce(true);
            service['defaultBotBehavior'](mockGame as Game, mockBot, mockEnemies);
            expect(botUtilsService.canAttackEnemyFromThatTile).toHaveBeenCalled();
        });
    });

    describe('handleAggressiveBotBehavior', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'moveAndAttackEnemy').mockImplementation(async () => false);
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            jest.spyOn(service as any, 'moveAndAttackEnemy').mockResolvedValueOnce(true);

            await service['handleAggressiveBotBehavior'](mockBotBehaviorContext);

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);

            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);

            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
        });

        it('should go for enemy position when bot has 2 or more items and item is in range', async () => {
            const botWithTwoItems = { ...mockBot, items: [{ name: 'item1' } as any, { name: 'item2' } as any] };
            const contextWithItemInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithTwoItems,
                enemyInRange: false,
                itemInRange: true,
            };
            await service['handleAggressiveBotBehavior'](contextWithItemInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithTwoItems, mockEnemies, mockEnemy.position, true);
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            jest.spyOn(service as any, 'moveAndAttackEnemy').mockResolvedValueOnce(true);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            const contextWithEnemyInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                enemyInRange: true,
            };
            await service['handleAggressiveBotBehavior'](contextWithEnemyInRange);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).not.toHaveBeenCalled();
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);
            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
        });

        it('should prioritize attacking enemy if in range', async () => {
            const contextWithEnemyInRange: BotBehaviorContext = { ...mockBotBehaviorContext, enemyInRange: true };
            await service['handleAggressiveBotBehavior'](contextWithEnemyInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, mockEnemy.position, true);
        });

        it('should go for item if in range and bot has less than 2 items', async () => {
            const botWithNoItems = { ...mockBot, items: [] };
            const contextWithItemInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithNoItems,
                enemyInRange: false,
                itemInRange: true,
            };
            await service['handleAggressiveBotBehavior'](contextWithItemInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithNoItems, mockEnemies, mockClosestItem.position, true);
        });

        it('should move towards enemy if no item/enemy in range and cannot attack', async () => {
            botCombatService.tryToAttackEnemy.mockReturnValueOnce(false);
            const contextWithNothingInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                enemyInRange: false,
                itemInRange: false,
            };
            await service['handleAggressiveBotBehavior'](contextWithNothingInRange);
            expect(botCombatService.tryToAttackEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, mockEnemy.position, true);
        });

        it('should just attack if nothing is in range but can attack directly', async () => {
            botCombatService.tryToAttackEnemy.mockReturnValueOnce(true);
            const contextWithNothingInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                enemyInRange: false,
                itemInRange: false,
            };
            await service['handleAggressiveBotBehavior'](contextWithNothingInRange);
            expect(botCombatService.tryToAttackEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
            expect(botCombatService.attackEnemy).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies);
            expect(service['moveAndAttackEnemy']).not.toHaveBeenCalled();
        });
    });

    describe('handleDefensiveBotBehavior', () => {
        beforeEach(() => {
            jest.spyOn(service as any, 'moveAndAttackEnemy').mockImplementation(async () => false);
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');

            jest.spyOn(service as any, 'moveAndAttackEnemy').mockResolvedValueOnce(true);

            await service['handleDefensiveBotBehavior'](mockBotBehaviorContext);

            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);

            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
        });

        it('should go for enemy position when bot has 2 or more items and item is in range', async () => {
            const botWithTwoItems = { ...mockBot, items: [{ name: 'item1' } as any, { name: 'item2' } as any] };
            const contextWithItemInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithTwoItems,
                itemInRange: true,
                enemyInRange: false,
            };
            await service['handleDefensiveBotBehavior'](contextWithItemInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithTwoItems, mockEnemies, mockEnemy.position, true);
        });

        it('should go for enemy position when bot has 2 or more items and item is not in range', async () => {
            const botWithTwoItems = { ...mockBot, items: [{ name: 'item1' } as any, { name: 'item2' } as any] };
            const contextWithItemNotInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithTwoItems,
                itemInRange: false,
                enemyInRange: false,
                closestItem: mockClosestItem,
            };
            await service['handleDefensiveBotBehavior'](contextWithItemNotInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithTwoItems, mockEnemies, mockEnemy.position, true);
        });

        it('should call botBehavior after timeout when moveAndAttackEnemy returns true', async () => {
            const botBehaviorSpy = jest.spyOn(service, 'botBehavior');
            jest.spyOn(service as any, 'moveAndAttackEnemy').mockResolvedValueOnce(true);
            const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
            const contextWithEnemyInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                enemyInRange: true,
                itemInRange: false,
            };
            await service['handleDefensiveBotBehavior'](contextWithEnemyInRange);
            expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).not.toHaveBeenCalled();
            jest.advanceTimersByTime(ATTACK_DELAY_FOR_BOTS);
            expect(botBehaviorSpy).toHaveBeenCalledWith(mockGame, mockBot);
            setTimeoutSpy.mockRestore();
            botBehaviorSpy.mockRestore();
        });

        it('should prioritize enemy if in range and no item in range', async () => {
            const contextWithEnemyInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                enemyInRange: true,
                itemInRange: false,
            };
            await service['handleDefensiveBotBehavior'](contextWithEnemyInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, mockEnemy.position, true);
        });

        it('should go for item if in range and bot has less than 2 items', async () => {
            const botWithNoItems = { ...mockBot, items: [] };
            const contextWithItemInRange: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithNoItems,
                itemInRange: true,
            };
            await service['handleDefensiveBotBehavior'](contextWithItemInRange);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithNoItems, mockEnemies, mockClosestItem.position, true);
        });

        it('should move towards item if not in range and bot has less than 2 items', async () => {
            const botWithNoItems = { ...mockBot, items: [] };
            const contextWithClosestItem: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                bot: botWithNoItems,
                itemInRange: false,
                closestItem: mockClosestItem,
            };
            await service['handleDefensiveBotBehavior'](contextWithClosestItem);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, botWithNoItems, mockEnemies, mockClosestItem.position, true);
        });

        it('should move towards enemy as fallback', async () => {
            const contextWithNoItems: BotBehaviorContext = {
                ...mockBotBehaviorContext,
                itemInRange: false,
                closestItem: null,
            };
            await service['handleDefensiveBotBehavior'](contextWithNoItems);
            expect(service['moveAndAttackEnemy']).toHaveBeenCalledWith(mockGame, mockBot, mockEnemies, mockEnemy.position, true);
        });
    });
});
