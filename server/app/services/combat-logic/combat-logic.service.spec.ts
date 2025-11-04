/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { Game } from '@app/model/class/game/game';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { GameObjects, Teams } from '@common/game/game-enums';
import { NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY } from '@common/game/game-info';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { CombatLogicService } from './combat-logic.service';

describe('CombatLogicService', () => {
    let service: CombatLogicService;
    let mockAttacker: Player;
    let mockTarget: Player;
    let mockCombatTurnLogicService: Partial<CombatTurnLogicService>;
    let mockTurnLogicService: Partial<TurnLogicService>;
    let mockChatService: Partial<ChatService>;
    let mockItemBehaviorService: Partial<ItemBehaviorService>;
    let mockServer: Partial<Server>;
    let mockGames: Map<string, Game>;
    let emitMock: jest.Mock;
    let toSpy: jest.Mock;

    const BASE_POWER = 4;
    const DEBUFF_VALUE = 2;
    const BONUS_DEFENSE = 1;
    const ZERO = 0;
    const ONE = 1;
    const HALF = 0.5;
    const HIGH_RANDOM = 0.9;
    const LOW_RANDOM = 0.1;
    const MAX_ESCAPES_ATTEMPTS = 2;
    const ARRAY_SIZE = 10;

    const createMockGame = (players = [mockAttacker, mockTarget], isDebugMode = false) =>
        ({
            id: 'game1',
            players,
            isDebugModeActive: isDebugMode,
            gridState: {
                grid: Array(ARRAY_SIZE)
                    .fill(null)
                    .map(() =>
                        Array(ARRAY_SIZE).fill({
                            tileCost: 1,
                            isDoor: false,
                            isTraversable: true,
                            spawnpoint: null,
                        }),
                    ),
            },
        }) as Game;

    const createBotPlayer = (overrides = {}) => ({
        ...mockAttacker,
        _id: 'bot-1',
        isBot: true,
        ...overrides,
    });

    beforeEach(async () => {
        mockAttacker = {
            _id: 'player1',
            name: 'Player 1',
            healthPower: 10,
            maxHealthPower: 10,
            attackPower: 5,
            defensePower: 3,
            position: { x: 1, y: 1 },
            spawnPointPosition: { x: 0, y: 0 },
            escapesAttempts: 0,
            nbFightsWon: 0,
            isWinner: false,
            team: Teams.None,
            buffs: { attackBuff: 0, defenseBuff: 0 },
            isBot: false,
            isTurn: false,
            isAggressive: true,
        } as Player;

        mockTarget = {
            ...mockAttacker,
            _id: 'player2',
            name: 'Player 2',
            attackPower: 4,
            defensePower: 2,
            position: { x: 2, y: 2 },
            spawnPointPosition: { x: 5, y: 5 },
            isAggressive: false,
        } as Player;

        emitMock = jest.fn();
        mockServer = {
            to: jest.fn().mockReturnValue({
                emit: emitMock,
                adapter: {},
                rooms: new Set(),
                exceptRooms: new Set(),
                flags: {},
                broadcast: jest.fn(),
                compress: jest.fn().mockReturnThis(),
                except: jest.fn().mockReturnThis(),
                timeout: jest.fn().mockReturnThis(),
            }),
        };
        toSpy = mockServer.to as jest.Mock;

        mockGames = new Map<string, Game>();
        mockCombatTurnLogicService = {
            registerBotAttackHandler: jest.fn(),
            nextCombatTurn: jest.fn(),
            endCombat: jest.fn(),
        };
        mockChatService = {
            escapeAttemptEvent: jest.fn(),
            tooManyEscapeAttemptsEvent: jest.fn(),
            attackEvent: jest.fn(),
            combatEndedEvent: jest.fn(),
        };
        mockTurnLogicService = { endBotTurn: jest.fn() };
        mockItemBehaviorService = {
            applyPassiveItemEffect: jest.fn(),
            removePassiveItemEffect: jest.fn(),
            applyCombatItemEffect: jest.fn(),
            removeCombatItemEffect: jest.fn(),
            applyCombatEndItemEffect: jest.fn(),
            dropAllItems: jest.fn().mockReturnValue([mockAttacker, mockTarget]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatLogicService,
                { provide: CombatTurnLogicService, useValue: mockCombatTurnLogicService },
                { provide: TurnLogicService, useValue: mockTurnLogicService },
                { provide: ItemBehaviorService, useValue: mockItemBehaviorService },
                { provide: ChatService, useValue: mockChatService },
            ],
        }).compile();

        service = module.get<CombatLogicService>(CombatLogicService);
        service.setServer(mockServer as Server);
        service.setGames(mockGames);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('executeAttack', () => {
        const setupAttackTest = (isAttackerDebuffed = false, isTargetDebuffed = false) => {
            jest.spyOn(global.Math, 'random').mockReturnValueOnce(HALF).mockReturnValueOnce(HALF);
            const attackerPower = mockAttacker.attackPower;
            const targetPower = mockTarget.defensePower;
            const expectedAttackBonus = Math.floor(HALF * attackerPower) + ONE;
            const expectedDefenseBonus = Math.floor(HALF * targetPower) + ONE;
            const expectedAttackValue = BASE_POWER + expectedAttackBonus - (isAttackerDebuffed ? DEBUFF_VALUE : 0);
            const expectedDefenseValue = BASE_POWER + expectedDefenseBonus - (isTargetDebuffed ? DEBUFF_VALUE : 0);
            return { expectedAttackValue, expectedDefenseValue };
        };

        afterEach(() => jest.spyOn(global.Math, 'random').mockRestore());

        it('should execute normal attack with no debuffs', () => {
            const { expectedAttackValue, expectedDefenseValue } = setupAttackTest();
            const expectedDamage = Math.max(ZERO, expectedAttackValue - expectedDefenseValue);
            const expectedHealth = mockTarget.healthPower - expectedDamage;

            const result = service.executeAttack(mockAttacker, mockTarget, false, false);

            expect(result.attackValue).toBe(expectedAttackValue);
            expect(result.defenseValue).toBe(expectedDefenseValue);
            expect(mockTarget.healthPower).toBe(expectedHealth);
            expect(result.target).toBe(mockTarget);
            expect(result.attacker).toBe(mockAttacker);
        });

        it('should apply appropriate debuffs', () => {
            const attackerDebuffed = setupAttackTest(true, false);
            const result1 = service.executeAttack(mockAttacker, mockTarget, true, false);
            expect(result1.attackValue).toBe(attackerDebuffed.expectedAttackValue);
            expect(result1.defenseValue).toBe(attackerDebuffed.expectedDefenseValue);

            mockTarget.healthPower = 10;
            jest.spyOn(global.Math, 'random').mockRestore();
            jest.spyOn(global.Math, 'random').mockReturnValueOnce(HALF).mockReturnValueOnce(HALF);

            const targetDebuffed = setupAttackTest(false, true);
            const result2 = service.executeAttack(mockAttacker, mockTarget, false, true);
            expect(result2.attackValue).toBe(targetDebuffed.expectedAttackValue);
            expect(result2.defenseValue).toBe(targetDebuffed.expectedDefenseValue);

            mockTarget.healthPower = 10;
            jest.spyOn(global.Math, 'random').mockRestore();
            jest.spyOn(global.Math, 'random').mockReturnValueOnce(HALF).mockReturnValueOnce(HALF);

            const bothDebuffed = setupAttackTest(true, true);
            const result3 = service.executeAttack(mockAttacker, mockTarget, true, true);
            expect(result3.attackValue).toBe(bothDebuffed.expectedAttackValue);
            expect(result3.defenseValue).toBe(bothDebuffed.expectedDefenseValue);
        });

        it('should handle defeating a target', () => {
            mockTarget.healthPower = ONE;
            jest.spyOn(global.Math, 'random').mockReturnValueOnce(HIGH_RANDOM).mockReturnValueOnce(LOW_RANDOM);

            const result = service.executeAttack(mockAttacker, mockTarget, false, false);

            expect(mockTarget.healthPower).toBe(ZERO);
            expect(result.target.healthPower).toBe(ZERO);
        });
    });

    describe('executeDebugAttack', () => {
        it('should execute debug attack with deterministic values', () => {
            const expectedAttackValue = BASE_POWER + mockAttacker.attackPower;
            const expectedDefenseValue = BASE_POWER + BONUS_DEFENSE;
            const expectedDamage = Math.max(ZERO, expectedAttackValue - expectedDefenseValue);
            const expectedHealth = mockTarget.healthPower - expectedDamage;

            const result = service.executeDebugAttack(mockAttacker, mockTarget);

            expect(result.attackValue).toBe(expectedAttackValue);
            expect(result.defenseValue).toBe(expectedDefenseValue);
            expect(mockTarget.healthPower).toBe(expectedHealth);
        });

        it('should handle defeating a target with debug attack', () => {
            mockTarget.healthPower = ONE;
            const result = service.executeDebugAttack(mockAttacker, mockTarget);
            expect(mockTarget.healthPower).toBe(ZERO);
            expect(result.target.healthPower).toBe(ZERO);
        });
    });

    describe('playerWonACombat', () => {
        it('should increment player win counter and set winner status appropriately', () => {
            mockAttacker.nbFightsWon = ONE;
            const result = service.playerWonACombat(mockAttacker);
            expect(result.nbFightsWon).toBe(2);
            expect(result.isWinner).toBe(false);
            mockAttacker.nbFightsWon = NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY - ONE;
            const playerWonGameSpy = jest.spyOn(service, 'playerWonGame');
            const result2 = service.playerWonACombat(mockAttacker);
            expect(result2.nbFightsWon).toBe(NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY);
            expect(result2.isWinner).toBe(true);
            expect(playerWonGameSpy).toHaveBeenCalledWith(mockAttacker);

            mockAttacker.isWinner = false;
            mockAttacker.team = Teams.BlueSide;
            mockAttacker.nbFightsWon = NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY - ONE;

            jest.spyOn(service, 'playerWonGame').mockImplementation(() => mockAttacker);

            const result3 = service.playerWonACombat(mockAttacker);
            expect(result3.nbFightsWon).toBe(NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY);
            expect(result3.isWinner).toBe(false);
        });
    });

    describe('respawnPlayer and resetPlayerHealth', () => {
        it('should reset player position and health', () => {
            const originalSpawnPosition = { x: 3, y: 4 };
            mockAttacker.position = { x: 10, y: 10 };
            mockAttacker.spawnPointPosition = originalSpawnPosition;
            mockAttacker.healthPower = ONE;
            mockAttacker.escapesAttempts = 2;

            const mockGame = createMockGame([mockAttacker]);
            const resetSpy = jest.spyOn(service, 'resetPlayerHealth');
            const result = service.respawnPlayer(mockAttacker, mockGame);

            expect(result.position).toEqual(originalSpawnPosition);
            expect(result.healthPower).toBe(result.maxHealthPower);
            expect(resetSpy).toHaveBeenCalledWith(mockAttacker);
            expect(result.escapesAttempts).toBe(ZERO);
        });

        it('should find an alternative spawn position when original is occupied', () => {
            const spawnPosition = { x: 3, y: 4 };
            mockAttacker.spawnPointPosition = spawnPosition;
            mockAttacker.position = { x: 10, y: 10 };

            const occupyingPlayer = {
                ...mockAttacker,
                _id: 'player-blocking',
                position: { x: spawnPosition.x, y: spawnPosition.y },
            };

            const mockGame = createMockGame([mockAttacker, occupyingPlayer]);

            const alternativePosition = { x: 3, y: 5 };
            jest.spyOn(service as any, 'findClosestTileToSpawnpoint').mockReturnValue(alternativePosition);

            const result = service.respawnPlayer(mockAttacker, mockGame);

            expect(result.position).toEqual(alternativePosition);
            expect((service as any).findClosestTileToSpawnpoint).toHaveBeenCalledWith(mockGame, spawnPosition);
        });

        it('should fall back to original spawn position if no alternative is found', () => {
            const spawnPosition = { x: 3, y: 4 };
            mockAttacker.spawnPointPosition = spawnPosition;
            mockAttacker.position = { x: 10, y: 10 };

            const occupyingPlayer = {
                ...mockAttacker,
                _id: 'player-blocking',
                position: { x: spawnPosition.x, y: spawnPosition.y },
            };

            const mockGame = createMockGame([mockAttacker, occupyingPlayer]);

            jest.spyOn(service as any, 'findClosestTileToSpawnpoint').mockReturnValue(null);

            const result = service.respawnPlayer(mockAttacker, mockGame);

            expect(result.position).toEqual(spawnPosition);
        });
    });

    describe('playerWonGame', () => {
        it('should mark player as winner', () => {
            mockAttacker.isWinner = false;
            const result = service.playerWonGame(mockAttacker);
            expect(result.isWinner).toBe(true);
        });
    });

    describe('tryToEscape', () => {
        afterEach(() => jest.spyOn(global.Math, 'random').mockRestore());

        it('should handle escape attempts appropriately', () => {
            const gameId = 'game1';

            jest.spyOn(global.Math, 'random').mockReturnValue(LOW_RANDOM);
            const result1 = service.tryToEscape(gameId, mockAttacker);
            expect(result1).toBe(true);
            expect(mockAttacker.escapesAttempts).toBe(ONE);
            expect(mockChatService.escapeAttemptEvent).toHaveBeenCalledWith(gameId, mockAttacker, true);

            mockAttacker.escapesAttempts = 0;
            jest.spyOn(global.Math, 'random').mockRestore();

            jest.spyOn(global.Math, 'random').mockReturnValue(HIGH_RANDOM);
            const result2 = service.tryToEscape(gameId, mockAttacker);
            expect(result2).toBe(false);
            expect(mockAttacker.escapesAttempts).toBe(ONE);
            expect(mockChatService.escapeAttemptEvent).toHaveBeenCalledWith(gameId, mockAttacker, false);

            mockAttacker.escapesAttempts = MAX_ESCAPES_ATTEMPTS;
            const result3 = service.tryToEscape(gameId, mockAttacker);
            expect(result3).toBe(false);
            expect(mockAttacker.escapesAttempts).toBe(MAX_ESCAPES_ATTEMPTS);
            expect(mockChatService.tooManyEscapeAttemptsEvent).toHaveBeenCalledWith(gameId, mockAttacker);
        });
    });

    describe('processAttack', () => {
        beforeEach(() => {
            mockAttacker.items = [];
            mockTarget.items = [];
        });

        it('should process normal attack in non-debug mode', async () => {
            const game = createMockGame();

            jest.spyOn(service as any, 'applyIceDebuffs').mockReturnValue({
                isAttackerDebuffed: false,
                isTargetDebuffed: false,
            });

            jest.spyOn(service, 'executeAttack').mockReturnValue({
                attacker: mockAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            });

            const result = await service.processAttack(game, mockAttacker._id, mockTarget._id);

            expect(service.executeAttack).toHaveBeenCalled();
            expect(mockChatService.attackEvent).toHaveBeenCalled();
            expect(result.combatFinished).toBe(false);
        });

        it('should process attack in debug mode', async () => {
            const game = createMockGame(undefined, true);

            jest.spyOn(service, 'executeDebugAttack').mockReturnValue({
                attacker: mockAttacker,
                target: mockTarget,
                attackValue: 15,
                defenseValue: 5,
            });

            const result = await service.processAttack(game, mockAttacker._id, mockTarget._id);

            expect(service.executeDebugAttack).toHaveBeenCalled();
            expect(result.combatFinished).toBe(false);
        });

        it('should call endFight when target health is 0', async () => {
            const deadTarget = {
                ...mockTarget,
                healthPower: 0,
                items: [],
            };
            mockAttacker.items = [];

            const game = createMockGame([mockAttacker, deadTarget]);

            jest.spyOn(service, 'executeAttack').mockReturnValue({
                attacker: mockAttacker,
                target: deadTarget,
                attackValue: 10,
                defenseValue: 5,
            });

            const endFightSpy = jest.spyOn(service as any, 'endFight').mockReturnValue({
                combatFinished: true,
                attacker: mockAttacker,
                target: deadTarget,
                attackValue: 10,
                defenseValue: 5,
            });

            const result = await service.processAttack(game, mockAttacker._id, deadTarget._id);

            expect(endFightSpy).toHaveBeenCalled();
            expect(result.combatFinished).toBe(true);
        });

        it('should return undefined if players are not found', async () => {
            const game = createMockGame();

            const result = await service.processAttack(game, 'nonexistent', mockTarget._id);
            expect(result).toBeUndefined();
        });
    });

    describe('playerAttackLogic', () => {
        let mockGame: Game;

        beforeEach(() => {
            mockGame = createMockGame();
            mockGames.set('game1', mockGame);
        });

        it('should handle bot turns and winners appropriately', async () => {
            const botAttacker = createBotPlayer({ isTurn: true });
            const botGame = createMockGame([botAttacker, mockTarget]);
            mockGames.set('game1', botGame);

            jest.spyOn(service, 'processAttack').mockResolvedValue({
                combatFinished: true,
                attacker: botAttacker,
                target: mockTarget,
                attackValue: 7,
                defenseValue: 5,
            });

            await service.playerAttackLogic(botGame, botAttacker._id, mockTarget._id, false);
            expect(mockTurnLogicService.endBotTurn).toHaveBeenCalledWith('game1');

            const winnerAttacker = { ...mockAttacker, isWinner: true };
            const gameWithWinner = createMockGame([winnerAttacker, mockTarget]);
            mockGames.set('game1', gameWithWinner);

            jest.spyOn(service, 'processAttack').mockResolvedValue({
                combatFinished: true,
                attacker: winnerAttacker,
                target: mockTarget,
                attackValue: 7,
                defenseValue: 5,
            });

            await service.playerAttackLogic(gameWithWinner, winnerAttacker._id, mockTarget._id, false);

            expect(toSpy).toHaveBeenCalledWith('game1');
            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.PlayerWonGame, winnerAttacker.name);
        });

        it('should handle auto attacks and combat states correctly', async () => {
            jest.spyOn(service, 'processAttack').mockResolvedValue({
                combatFinished: false,
                attacker: mockAttacker,
                target: mockTarget,
                attackValue: 7,
                defenseValue: 5,
            });

            await service.playerAttackLogic(mockGame, mockAttacker._id, mockTarget._id, false);
            expect(mockCombatTurnLogicService.nextCombatTurn).toHaveBeenCalledWith('game1');

            jest.clearAllMocks();
            await service.playerAttackLogic(mockGame, mockAttacker._id, mockTarget._id, true);
            expect(mockCombatTurnLogicService.nextCombatTurn).not.toHaveBeenCalled();

            jest.clearAllMocks();
            jest.spyOn(service, 'processAttack').mockResolvedValue({
                combatFinished: true,
                attacker: mockAttacker,
                target: mockTarget,
                attackValue: 7,
                defenseValue: 5,
            });

            await service.playerAttackLogic(mockGame, mockAttacker._id, mockTarget._id, false);
            expect(mockCombatTurnLogicService.endCombat).toHaveBeenCalledWith('game1');

            jest.clearAllMocks();
            jest.spyOn(service, 'processAttack').mockResolvedValue(undefined);
            await service.playerAttackLogic(mockGame, mockAttacker._id, 'nonexistent', false);
            expect(mockServer.to).not.toHaveBeenCalled();
            expect(mockCombatTurnLogicService.nextCombatTurn).not.toHaveBeenCalled();
        });
    });

    describe('item effect methods', () => {
        beforeEach(() => {
            mockAttacker.items = [{ item: GameObjects.Shield, position: { x: 0, y: 0 } }];
            mockTarget.items = [{ item: GameObjects.Armor, position: { x: 1, y: 1 } }];
        });

        it('should apply combat item effects', () => {
            service['applyCombatItemEffects'](mockAttacker);

            expect(mockItemBehaviorService.applyCombatItemEffect).toHaveBeenCalledWith({
                gameItem: mockAttacker.items[0],
                player: mockAttacker,
            });
        });

        it('should remove active combat item effects', () => {
            service['removeActiveCombatItemEffects'](mockAttacker);

            expect(mockItemBehaviorService.removeCombatItemEffect).toHaveBeenCalledWith({
                gameItem: mockAttacker.items[0],
                player: mockAttacker,
            });
        });

        it('should apply end of fight item effects', () => {
            const game = createMockGame();

            service['applyEndOfFightItemEffects'](game, mockAttacker, mockTarget);

            expect(mockItemBehaviorService.applyCombatEndItemEffect).toHaveBeenCalledWith({
                gameItem: mockAttacker.items[0],
                itemHolder: mockAttacker,
                opposingPlayer: mockTarget,
                game,
            });
        });

        it('should drop all items', () => {
            const game = createMockGame();

            mockItemBehaviorService.dropAllItems(game, mockAttacker);

            expect(mockItemBehaviorService.dropAllItems).toHaveBeenCalledWith(game, mockAttacker);
        });
    });

    describe('ice debuff mechanics', () => {
        it('should detect if player is on ice', () => {
            const game = createMockGame();
            game.gridState.grid[1][1].tileCost = 0;

            const result = service['isPlayerOnIce'](game, mockAttacker);
            expect(result).toBe(true);

            game.gridState.grid[1][1].tileCost = 1;
            const result2 = service['isPlayerOnIce'](game, mockAttacker);
            expect(result2).toBe(false);
        });

        it('should apply ice debuffs correctly', () => {
            const game = createMockGame();
            game.gridState.grid[1][1].tileCost = 0;

            const result = service['applyIceDebuffs'](game, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: true,
                isTargetDebuffed: false,
            });

            const debugGame = createMockGame(undefined, true);
            debugGame.gridState.grid[1][1].tileCost = 0;

            const resultDebug = service['applyIceDebuffs'](debugGame, mockAttacker, mockTarget);
            expect(resultDebug).toEqual({
                isAttackerDebuffed: false,
                isTargetDebuffed: false,
            });
        });
    });

    it('should handle end of fight correctly', () => {
        const game = createMockGame();
        mockAttacker.items = [];
        mockTarget.items = [];

        const attackResult = {
            attacker: mockAttacker,
            target: mockTarget,
            attackValue: 10,
            defenseValue: 5,
        };

        jest.spyOn(service as any, 'applyEndOfFightItemEffects');

        jest.spyOn(service, 'respawnPlayer').mockReturnValue(mockTarget);
        jest.spyOn(service, 'resetPlayerHealth').mockReturnValue(mockAttacker);
        jest.spyOn(service, 'playerWonACombat').mockReturnValue(mockAttacker);
        jest.spyOn(service as any, 'removeActiveCombatItemEffects');

        const result = service['endFight'](attackResult, game);

        expect(service['applyEndOfFightItemEffects']).toHaveBeenCalledTimes(2);
        expect(mockItemBehaviorService.dropAllItems).toHaveBeenCalledWith(game, mockTarget);
        expect(service.respawnPlayer).toHaveBeenCalledWith(mockTarget, game);
        expect(service.resetPlayerHealth).toHaveBeenCalledWith(mockAttacker);
        expect(service.playerWonACombat).toHaveBeenCalledWith(mockAttacker);
        expect(service['removeActiveCombatItemEffects']).toHaveBeenCalledTimes(2);
        expect(result.combatFinished).toBe(true);
    });

    describe('applyIceDebuffs', () => {
        it('should correctly identify ice debuffs for both players in various situations', () => {
            const game = createMockGame();

            game.gridState.grid[mockAttacker.position.x][mockAttacker.position.y].tileCost = 0;
            game.gridState.grid[mockTarget.position.x][mockTarget.position.y].tileCost = 0;

            let result = service['applyIceDebuffs'](game, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: true,
                isTargetDebuffed: true,
            });

            game.gridState.grid[mockTarget.position.x][mockTarget.position.y].tileCost = 1;

            result = service['applyIceDebuffs'](game, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: true,
                isTargetDebuffed: false,
            });

            game.gridState.grid[mockAttacker.position.x][mockAttacker.position.y].tileCost = 1;
            game.gridState.grid[mockTarget.position.x][mockTarget.position.y].tileCost = 0;

            result = service['applyIceDebuffs'](game, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: false,
                isTargetDebuffed: true,
            });

            game.gridState.grid[mockAttacker.position.x][mockAttacker.position.y].tileCost = 1;
            game.gridState.grid[mockTarget.position.x][mockTarget.position.y].tileCost = 1;

            result = service['applyIceDebuffs'](game, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: false,
                isTargetDebuffed: false,
            });

            const debugGame = createMockGame(undefined, true);
            debugGame.gridState.grid[mockAttacker.position.x][mockAttacker.position.y].tileCost = 0;
            debugGame.gridState.grid[mockTarget.position.x][mockTarget.position.y].tileCost = 0;

            result = service['applyIceDebuffs'](debugGame, mockAttacker, mockTarget);
            expect(result).toEqual({
                isAttackerDebuffed: false,
                isTargetDebuffed: false,
            });
        });
    });

    describe('setBotAttackHandler', () => {
        let botAttackHandler: (gameId: string, firstPlayerId: string, secondPlayerId: string) => void;

        beforeEach(() => {
            (mockCombatTurnLogicService.registerBotAttackHandler as jest.Mock).mockImplementation((handler) => {
                botAttackHandler = handler;
            });

            service = new CombatLogicService(
                mockCombatTurnLogicService as any,
                mockTurnLogicService as any,
                mockItemBehaviorService as any,
                mockChatService as any,
            );
            service.setServer(mockServer as any);
            service.setGames(mockGames);
        });

        it('should exit early when game is not found', () => {
            const nonExistentGameId = 'non-existent-game';
            mockGames.set('game1', createMockGame());

            const shouldBotTryToEscapeSpy = jest.spyOn(service as any, 'shoudlBotTryToEscape');
            const tryToEscapeSpy = jest.spyOn(service, 'tryToEscape');
            const botEscapedSpy = jest.spyOn(service as any, 'botEscaped');
            const playerAttackLogicSpy = jest.spyOn(service, 'playerAttackLogic').mockImplementation();

            botAttackHandler(nonExistentGameId, 'bot-1', 'player2');

            expect(shouldBotTryToEscapeSpy).not.toHaveBeenCalled();
            expect(tryToEscapeSpy).not.toHaveBeenCalled();
            expect(botEscapedSpy).not.toHaveBeenCalled();
            expect(playerAttackLogicSpy).not.toHaveBeenCalled();
        });

        it('should proceed normally when game is found', () => {
            const existingGameId = 'existing-game';
            const botPlayer = {
                _id: 'bot-1',
                isBot: true,
                isAggressive: true,
                items: [],
                position: { x: 1, y: 1 },
            } as unknown as Player;
            const targetPlayer = {
                _id: 'player2',
                items: [],
                position: { x: 2, y: 2 },
            } as unknown as Player;

            const mockGame = createMockGame([botPlayer, targetPlayer]);
            mockGames.set(existingGameId, mockGame);

            const playerAttackLogicSpy = jest.spyOn(service, 'playerAttackLogic').mockImplementation();

            botAttackHandler(existingGameId, 'bot-1', 'player2');

            expect(playerAttackLogicSpy).toHaveBeenCalledWith(mockGame, 'bot-1', 'player2', true);
        });
    });

    describe('combatFinished', () => {
        it('should call endBotTurn when attacker is a bot on its turn', () => {
            const botAttacker = {
                ...mockAttacker,
                isBot: true,
                isTurn: true,
                items: [],
            };
            const game = createMockGame([botAttacker, { ...mockTarget, items: [] }]);

            const attackState = {
                combatFinished: true,
                attacker: botAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            const endBotTurnSpy = jest.spyOn(mockTurnLogicService, 'endBotTurn');

            service['combatFinished'](game, attackState);

            expect(endBotTurnSpy).toHaveBeenCalledWith(game.id);
        });

        it('should call endBotTurn when target is a bot on its turn', () => {
            const botTarget = {
                ...mockTarget,
                isBot: true,
                isTurn: true,
                items: [],
            };
            const game = createMockGame([{ ...mockAttacker, items: [] }, botTarget]);

            const attackState = {
                combatFinished: true,
                attacker: mockAttacker,
                target: botTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            const endBotTurnSpy = jest.spyOn(mockTurnLogicService, 'endBotTurn');

            service['combatFinished'](game, attackState);

            expect(endBotTurnSpy).toHaveBeenCalledWith(game.id);
        });

        it('should not call endBotTurn when no bot is on its turn', () => {
            const attackerNotBot = {
                ...mockAttacker,
                isBot: false,
                isTurn: false,
                items: [],
            };
            const targetNotBot = {
                ...mockTarget,
                isBot: false,
                isTurn: true,
                items: [],
            };
            const game = createMockGame([attackerNotBot, targetNotBot]);

            const attackState = {
                combatFinished: true,
                attacker: attackerNotBot,
                target: targetNotBot,
                attackValue: 10,
                defenseValue: 5,
            };

            const endBotTurnSpy = jest.spyOn(mockTurnLogicService, 'endBotTurn');

            service['combatFinished'](game, attackState);

            expect(endBotTurnSpy).not.toHaveBeenCalled();
        });

        it('should not call endBotTurn when combat is not finished', () => {
            const botAttacker = {
                ...mockAttacker,
                isBot: true,
                isTurn: true,
                items: [],
            };
            const game = createMockGame([botAttacker, { ...mockTarget, items: [] }]);

            const attackState = {
                combatFinished: false,
                attacker: botAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            const endBotTurnSpy = jest.spyOn(mockTurnLogicService, 'endBotTurn');

            service['combatFinished'](game, attackState);

            expect(endBotTurnSpy).not.toHaveBeenCalled();
        });

        it('should handle end of combat properly', () => {
            const game = createMockGame();
            const attackState = {
                combatFinished: true,
                attacker: mockAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            service['combatFinished'](game, attackState);

            expect(mockCombatTurnLogicService.endCombat).toHaveBeenCalledWith(game.id);
            expect(mockChatService.combatEndedEvent).toHaveBeenCalledWith(game.id, mockAttacker._id, mockAttacker.name);
            expect(toSpy).toHaveBeenCalledWith(game.id);
            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded, { winnerId: mockAttacker._id });
            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems);
        });

        it('should handle bot turn end when bot is in combat', () => {
            const botAttacker = { ...mockAttacker, isBot: true, isTurn: true };
            const game = createMockGame([botAttacker, mockTarget]);
            const attackState = {
                combatFinished: true,
                attacker: botAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            service['combatFinished'](game, attackState);

            expect(mockTurnLogicService.endBotTurn).toHaveBeenCalledWith(game.id);
        });

        it('should announce game victory when attacker is the winner', () => {
            const winningAttacker = { ...mockAttacker, isWinner: true };
            const game = createMockGame([winningAttacker, mockTarget]);
            const attackState = {
                combatFinished: true,
                attacker: winningAttacker,
                target: mockTarget,
                attackValue: 10,
                defenseValue: 5,
            };

            service['combatFinished'](game, attackState);

            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.PlayerWonGame, winningAttacker.name);
        });
    });

    describe('setBotAttackHandler and shouldBotTryToEscape', () => {
        let botAttackHandler: Function;

        beforeEach(() => {
            (mockCombatTurnLogicService.registerBotAttackHandler as jest.Mock).mockImplementation((handler: Function) => {
                botAttackHandler = handler;
            });

            service = new CombatLogicService(
                mockCombatTurnLogicService as CombatTurnLogicService,
                mockTurnLogicService as TurnLogicService,
                mockItemBehaviorService as ItemBehaviorService,
                mockChatService as ChatService,
            );
            service.setServer(mockServer as Server);
            service.setGames(mockGames);
        });

        const setupBotTest = (botOverrides = {}) => {
            const gameId = 'game1';
            const botId = `bot-${Math.random()}`;
            const targetId = 'player2';

            const mockBot = createBotPlayer({ _id: botId, ...botOverrides });
            const mockGameWithBot = createMockGame([mockBot, mockTarget]);
            mockGames.set(gameId, mockGameWithBot);

            return {
                handlerFunction: botAttackHandler,
                gameId,
                botId,
                targetId,
                mockBot,
                mockGameWithBot,
            };
        };

        it('should register handler and execute appropriate bot behavior', () => {
            expect(mockCombatTurnLogicService.registerBotAttackHandler).toHaveBeenCalled();

            const { handlerFunction, gameId, botId, targetId, mockGameWithBot } = setupBotTest({ isAggressive: true });

            jest.spyOn(service, 'playerAttackLogic').mockImplementation(async () => Promise.resolve());
            handlerFunction(gameId, botId, targetId);
            expect(service.playerAttackLogic).toHaveBeenCalledWith(mockGameWithBot, botId, targetId, true);

            const escapeTest = setupBotTest({
                isAggressive: false,
                healthPower: 5,
                maxHealthPower: 10,
                escapesAttempts: 0,
            });

            jest.clearAllMocks();
            jest.spyOn(service, 'tryToEscape').mockReturnValue(true);
            jest.spyOn(service as any, 'botEscaped');

            handlerFunction(escapeTest.gameId, escapeTest.botId, escapeTest.targetId);

            expect(service.tryToEscape).toHaveBeenCalledWith(escapeTest.gameId, escapeTest.mockBot);
            expect(service['botEscaped']).toHaveBeenCalledWith(escapeTest.gameId, escapeTest.mockBot, mockTarget);
        });

        it('should correctly determine when a bot should try to escape', () => {
            const escapeTest = setupBotTest({
                isAggressive: false,
                healthPower: 5,
                maxHealthPower: 10,
                escapesAttempts: 0,
            });

            const shouldEscape = service['shoudlBotTryToEscape'](escapeTest.mockBot);
            expect(shouldEscape).toBe(true);

            const aggressiveTest = setupBotTest({
                isAggressive: true,
                healthPower: 5,
                maxHealthPower: 10,
            });

            const shouldNotEscapeAggressive = service['shoudlBotTryToEscape'](aggressiveTest.mockBot);
            expect(shouldNotEscapeAggressive).toBe(false);

            const healthyTest = setupBotTest({
                isAggressive: false,
                healthPower: 10,
                maxHealthPower: 10,
            });

            const shouldNotEscapeHealthy = service['shoudlBotTryToEscape'](healthyTest.mockBot);
            expect(shouldNotEscapeHealthy).toBe(false);
        });

        it('should handle bot escape properly', () => {
            const gameId = 'game1';
            const botPlayer = createBotPlayer();

            jest.spyOn(service, 'resetPlayerHealth');

            service['botEscaped'](gameId, botPlayer, mockTarget);

            expect(service.resetPlayerHealth).toHaveBeenCalledWith(mockTarget);
            expect(service.resetPlayerHealth).toHaveBeenCalledWith(botPlayer);
            expect(toSpy).toHaveBeenCalledWith(gameId);
            expect(emitMock).toHaveBeenCalledWith(GameGatewayEvents.PlayerEscaped, botPlayer._id);
            expect(mockCombatTurnLogicService.endCombat).toHaveBeenCalledWith(gameId);
        });
    });

    describe('setBotAttackHandler player identification', () => {
        let botAttackHandler: Function;

        beforeEach(() => {
            (mockCombatTurnLogicService.registerBotAttackHandler as jest.Mock).mockImplementation((handler: Function) => {
                botAttackHandler = handler;
                return;
            });

            service = new CombatLogicService(
                mockCombatTurnLogicService as CombatTurnLogicService,
                mockTurnLogicService as TurnLogicService,
                mockItemBehaviorService as ItemBehaviorService,
                mockChatService as ChatService,
            );
            service.setServer(mockServer as Server);
            service.setGames(mockGames);
        });

        it('should correctly identify bot when it is the first player parameter', () => {
            const botId = 'bot-123';
            const playerId = 'player456';
            const gameId = 'game1';

            const botPlayer = createBotPlayer({ _id: botId });
            const humanPlayer = { ...mockTarget, _id: playerId };

            const testGame = createMockGame([botPlayer, humanPlayer]);
            mockGames.set(gameId, testGame);

            jest.spyOn(service, 'playerAttackLogic').mockImplementation(async () => Promise.resolve());

            botAttackHandler(gameId, botId, playerId);

            expect(service.playerAttackLogic).toHaveBeenCalledWith(testGame, botId, playerId, true);
        });

        it('should correctly identify bot when it is the second player parameter', () => {
            const botId = 'bot-456';
            const playerId = 'player123';
            const gameId = 'game1';

            const botPlayer = createBotPlayer({ _id: botId });
            const humanPlayer = { ...mockTarget, _id: playerId };

            const testGame = createMockGame([humanPlayer, botPlayer]);
            mockGames.set(gameId, testGame);

            jest.spyOn(service, 'playerAttackLogic').mockImplementation(async () => Promise.resolve());

            botAttackHandler(gameId, playerId, botId);

            expect(service.playerAttackLogic).toHaveBeenCalledWith(testGame, botId, playerId, true);
        });

        it('should handle case where both players are bots', () => {
            const botId1 = 'bot-123';
            const botId2 = 'bot-456';
            const gameId = 'game1';

            const botPlayer1 = createBotPlayer({ _id: botId1 });
            const botPlayer2 = createBotPlayer({ _id: botId2 });

            const testGame = createMockGame([botPlayer1, botPlayer2]);
            mockGames.set(gameId, testGame);

            jest.spyOn(service, 'playerAttackLogic').mockImplementation(async () => Promise.resolve());

            botAttackHandler(gameId, botId1, botId2);

            expect(service.playerAttackLogic).toHaveBeenCalledWith(testGame, botId1, botId2, true);
        });
    });
});
