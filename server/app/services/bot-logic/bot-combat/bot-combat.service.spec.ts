import { getFakeGameInfo } from '@app/fake-game-info';
import { mockPlayer1, mockPlayer2 } from '@app/gateways/game/game-gateway-mocks';
import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameModes, Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { BotCombatService } from './bot-combat.service';

describe('BotCombatService', () => {
    let service: BotCombatService;
    let gameManagerService: jest.Mocked<GameManagerService>;
    let turnLogicService: jest.Mocked<TurnLogicService>;
    let botUtilsService: jest.Mocked<BotUtilsService>;
    let mockServer: jest.Mocked<Server>;

    const mockGameId = 'test-game-id';

    const mockBot: Player = {
        ...mockPlayer1,
        isBot: true,
        isTurn: true,
        actionPoints: 1,
    };

    const mockItemObject = {
        id: 'item1',
        name: 'Health Potion',
        description: 'Restores health',
        type: 'health',
        isActive: true,
    };

    const mockEnemy: Player = mockPlayer2;
    const mockEnemies: Player[] = [mockEnemy];

    const mockGame = {
        id: mockGameId,
        players: [mockBot, ...mockEnemies],
        gameInfo: getFakeGameInfo(),
        gameMode: GameModes.Classic,
        gameItems: [mockItemObject],
    } as Partial<Game>;

    const mockPath: Coordinate[] = [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
        { x: 1, y: 1 },
    ];

    beforeEach(async () => {
        gameManagerService = {
            getShortestPathToTileForBots: jest.fn(),
        } as unknown as jest.Mocked<GameManagerService>;

        turnLogicService = {
            endBotTurn: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        botUtilsService = {
            getAdjacentEnemyToAttack: jest.fn(),
        } as unknown as jest.Mocked<BotUtilsService>;

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BotCombatService,
                { provide: GameManagerService, useValue: gameManagerService },
                { provide: TurnLogicService, useValue: turnLogicService },
                { provide: BotUtilsService, useValue: botUtilsService },
            ],
        }).compile();

        service = module.get<BotCombatService>(BotCombatService);
        service.setServer(mockServer);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server', () => {
            const server = {} as Server;
            service.setServer(server);
        });
    });

    describe('attackEnemy', () => {
        it('should call tryToAttackEnemy if bot is not in combat', () => {
            const nonCombatBot = { ...mockBot, isInCombat: false };

            const tryToAttackSpy = jest.spyOn(service, 'tryToAttackEnemy').mockReturnValue(true);

            service.attackEnemy(mockGame as Game, nonCombatBot, mockEnemies);

            expect(tryToAttackSpy).toHaveBeenCalledWith(mockGame, nonCombatBot, mockEnemies);
        });

        it('should not call tryToAttackEnemy if bot is in combat', () => {
            const combatBot = { ...mockBot, isInCombat: true };

            const tryToAttackSpy = jest.spyOn(service, 'tryToAttackEnemy').mockReturnValue(true);

            service.attackEnemy(mockGame as Game, combatBot, mockEnemies);

            expect(tryToAttackSpy).not.toHaveBeenCalled();
        });

        it('should end bot turn if adjacentEnemy exists and actionPoints are 0 and not in combat', () => {
            const outOfActionsBot = { ...mockBot, isInCombat: false, actionPoints: 0 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(mockEnemy);
            jest.spyOn(service, 'tryToAttackEnemy').mockReturnValue(false);

            service.attackEnemy(mockGame as Game, outOfActionsBot, mockEnemies);

            expect(turnLogicService.endBotTurn).toHaveBeenCalledWith(mockGameId);
        });

        it('should not end bot turn if no adjacentEnemy exists', () => {
            const outOfActionsBot = { ...mockBot, isInCombat: false, actionPoints: 0 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(null);
            jest.spyOn(service, 'tryToAttackEnemy').mockReturnValue(false);

            service.attackEnemy(mockGame as Game, outOfActionsBot, mockEnemies);

            expect(turnLogicService.endBotTurn).not.toHaveBeenCalled();
        });

        it('should not end bot turn if in combat', () => {
            const combatBot = { ...mockBot, isInCombat: true, actionPoints: 0 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(mockEnemy);

            service.attackEnemy(mockGame as Game, combatBot, mockEnemies);

            expect(turnLogicService.endBotTurn).not.toHaveBeenCalled();
        });
    });

    describe('tryToAttackEnemy', () => {
        it('should start combat and return true if adjacent enemy exists and bot has action points', () => {
            const activeBot = { ...mockBot, actionPoints: 1 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(mockEnemy);

            const result = service.tryToAttackEnemy(mockGame as Game, activeBot, mockEnemies);

            expect(result).toBe(true);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.BotStartCombat, {
                botId: activeBot._id,
                targetId: mockEnemy._id,
            });
        });

        it('should return false if no adjacent enemy exists', () => {
            const activeBot = { ...mockBot, actionPoints: 1 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(null);

            const result = service.tryToAttackEnemy(mockGame as Game, activeBot, mockEnemies);

            expect(result).toBe(false);
            expect(mockServer.emit).not.toHaveBeenCalled();
        });

        it('should return false if bot has no action points', () => {
            const inactiveBot = { ...mockBot, actionPoints: 0 };

            botUtilsService.getAdjacentEnemyToAttack.mockReturnValue(mockEnemy);

            const result = service.tryToAttackEnemy(mockGame as Game, inactiveBot, mockEnemies);

            expect(result).toBe(false);
            expect(mockServer.emit).not.toHaveBeenCalled();
        });
    });

    describe('findClosestEnemy', () => {
        it('should return null if no enemies', () => {
            const result = service.findClosestEnemy(mockGame as Game, mockBot, []);

            expect(result).toBeNull();
        });

        it('should return the closest enemy based on path length', () => {
            const nearbyEnemy = { ...mockEnemy, _id: 'nearby-enemy' };
            const farEnemy = { ...mockEnemy, _id: 'far-enemy' };

            gameManagerService.getShortestPathToTileForBots.mockImplementation((gameId, botId, targetPosition) => {
                if (targetPosition === nearbyEnemy.position) {
                    return [
                        { x: 0, y: 0 },
                        { x: 1, y: 0 },
                    ];
                } else {
                    return [
                        { x: 0, y: 0 },
                        { x: 1, y: 0 },
                        { x: 2, y: 0 },
                        { x: 3, y: 0 },
                    ];
                }
            });

            const result = service.findClosestEnemy(mockGame as Game, mockBot, [nearbyEnemy, farEnemy]);

            expect(result).toBe(nearbyEnemy);
            expect(gameManagerService.getShortestPathToTileForBots).toHaveBeenCalledTimes(2);
        });

        it('should skip enemies from the same team (except Teams.None)', () => {
            const sameTeamEnemy = { ...mockEnemy, team: Teams.BlueSide };
            const botWithTeam = { ...mockBot, team: Teams.BlueSide };

            gameManagerService.getShortestPathToTileForBots.mockReturnValue(mockPath);

            const result = service.findClosestEnemy(mockGame as Game, botWithTeam, [sameTeamEnemy]);

            expect(result).toBeNull();
            expect(gameManagerService.getShortestPathToTileForBots).not.toHaveBeenCalled();
        });

        it('should return null if no valid path to any enemy', () => {
            gameManagerService.getShortestPathToTileForBots.mockReturnValue(null);

            const result = service.findClosestEnemy(mockGame as Game, mockBot, mockEnemies);

            expect(result).toBeNull();
        });

        it('should return null if path length is 0', () => {
            gameManagerService.getShortestPathToTileForBots.mockReturnValue([]);

            const result = service.findClosestEnemy(mockGame as Game, mockBot, mockEnemies);

            expect(result).toBeNull();
        });
    });
});
