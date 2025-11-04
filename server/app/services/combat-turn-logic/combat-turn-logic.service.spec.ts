/* eslint-disable max-lines */
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { MAX_ESCAPES_ATTEMPTS, REDUCED_COMBAT_TURN_DURATION, STANDARD_COMBAT_TURN_DURATION } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { mockPlayers } from '@common/player/mock-player';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { CombatTurnLogicService } from './combat-turn-logic.service';

describe('CombatTurnLogicService', () => {
    let service: CombatTurnLogicService;
    let mockServer: jest.Mocked<Server>;
    let mockTurnLogicService: jest.Mocked<TurnLogicService>;
    let testPlayers: Player[];
    let setIntervalCallbacks: { callback: () => void; delay: number }[] = [];

    const testGameId = 'test-game-id';
    const testPlayer1Id = 'player1';
    const testPlayer2Id = 'player2';

    beforeEach(async () => {
        setIntervalCallbacks = [];

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockTurnLogicService = {
            pauseTurnTimer: jest.fn(),
            resumeTurnTimer: jest.fn(),
            getPlayers: jest.fn(),
        } as unknown as jest.Mocked<TurnLogicService>;

        testPlayers = JSON.parse(JSON.stringify(mockPlayers));

        const module: TestingModule = await Test.createTestingModule({
            providers: [CombatTurnLogicService, { provide: TurnLogicService, useValue: mockTurnLogicService }],
        }).compile();

        service = module.get<CombatTurnLogicService>(CombatTurnLogicService);
        service.setServer(mockServer);

        jest.spyOn(global, 'setInterval').mockImplementation((callback, delay) => {
            const id = setTimeout(() => jest.fn(), 0);
            setIntervalCallbacks.push({ callback: callback as () => void, delay: delay as number });
            return id;
        });

        jest.spyOn(global, 'clearInterval').mockImplementation(jest.fn());
    });

    const runIntervalCallback = (index = 0) => {
        if (setIntervalCallbacks[index]) {
            setIntervalCallbacks[index].callback();
        }
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // describe('startCombat', () => {
    //     it('should initialize combat between two players', () => {
    //         const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn').mockImplementation(jest.fn());

    //         service.startCombat(testGameId, testPlayer1Id, testPlayer2Id);

    //         expect(service['combatParticipantsMap'].get(testGameId)).toEqual({
    //             firstPlayerToAttack: testPlayer1Id,
    //             secondPlayerToAttack: testPlayer2Id,
    //         });
    //         expect(service['currentCombatantMap'].get(testGameId)).toBe(testPlayer2Id);
    //         expect(startCombatTurnSpy).toHaveBeenCalledWith(testGameId, testPlayer2Id, true);
    //         expect(mockTurnLogicService.pauseTurnTimer).toHaveBeenCalledWith(testGameId);
    //     });
    // });

    describe('startCombatTurn', () => {
        beforeEach(() => {
            mockTurnLogicService.getPlayers.mockReturnValue(testPlayers);
        });

        it('should start combat turn with standard duration when player has not used max escape attempts', () => {
            testPlayers[0]._id = testPlayer1Id;
            testPlayers[0].escapesAttempts = 0;

            const startCombatTimerSpy = jest.spyOn(service, 'startCombatTimer').mockImplementation(jest.fn());

            service.startCombatTurn(testGameId, testPlayer1Id, false);

            expect(startCombatTimerSpy).toHaveBeenCalledWith(testGameId, STANDARD_COMBAT_TURN_DURATION, false);
            expect(testPlayers[0].isCombatTurn).toBe(true);
            expect(testPlayers[1].isCombatTurn).toBe(false);
            expect(service['combatActive'].get(testGameId)).toBe(true);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.CombatTurnChanged, testPlayer1Id);
        });

        it('should start combat turn with reduced duration when player has used max escape attempts', () => {
            testPlayers[0]._id = testPlayer1Id;
            testPlayers[0].escapesAttempts = MAX_ESCAPES_ATTEMPTS;

            const startCombatTimerSpy = jest.spyOn(service, 'startCombatTimer').mockImplementation(jest.fn());

            service.startCombatTurn(testGameId, testPlayer1Id, false);

            expect(startCombatTimerSpy).toHaveBeenCalledWith(testGameId, REDUCED_COMBAT_TURN_DURATION, false);
        });

        it('should do nothing if players not found for game', () => {
            mockTurnLogicService.getPlayers.mockReturnValue(undefined);

            const startCombatTimerSpy = jest.spyOn(service, 'startCombatTimer');

            service.startCombatTurn(testGameId, testPlayer1Id, false);

            expect(startCombatTimerSpy).not.toHaveBeenCalled();
        });
    });

    describe('nextCombatTurn', () => {
        beforeEach(() => {
            mockTurnLogicService.getPlayers.mockReturnValue(testPlayers);
            testPlayers[0]._id = testPlayer1Id;
            testPlayers[1]._id = testPlayer2Id;
        });

        it('should switch to the next player in combat', () => {
            service['combatParticipantsMap'].set(testGameId, {
                firstPlayerToAttack: testPlayer1Id,
                secondPlayerToAttack: testPlayer2Id,
            });
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);

            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn').mockImplementation(jest.fn());

            service.nextCombatTurn(testGameId);

            expect(startCombatTurnSpy).toHaveBeenCalledWith(testGameId, testPlayer2Id, false);
        });

        it('should switch back to first player after second player', () => {
            service['combatParticipantsMap'].set(testGameId, {
                firstPlayerToAttack: testPlayer1Id,
                secondPlayerToAttack: testPlayer2Id,
            });
            service['currentCombatantMap'].set(testGameId, testPlayer2Id);

            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn').mockImplementation(jest.fn());

            service.nextCombatTurn(testGameId);

            expect(startCombatTurnSpy).toHaveBeenCalledWith(testGameId, testPlayer1Id, false);
        });

        it('should do nothing if combat participants not found', () => {
            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn');

            service.nextCombatTurn(testGameId);

            expect(startCombatTurnSpy).not.toHaveBeenCalled();
        });

        it('should do nothing if current player not found', () => {
            service['combatParticipantsMap'].set(testGameId, {
                firstPlayerToAttack: testPlayer1Id,
                secondPlayerToAttack: testPlayer2Id,
            });

            const startCombatTurnSpy = jest.spyOn(service, 'startCombatTurn');

            service.nextCombatTurn(testGameId);

            expect(startCombatTurnSpy).not.toHaveBeenCalled();
        });
    });

    describe('startCombatTimer', () => {
        beforeEach(() => {
            mockTurnLogicService.getPlayers.mockReturnValue(testPlayers);
        });

        it('should initialize combat timer and emit event', () => {
            const clearCombatTimerSpy = jest.spyOn(service, 'clearCombatTimer').mockImplementation(jest.fn());
            const duration = 10;

            service.startCombatTimer(testGameId, duration, false);

            expect(clearCombatTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(service['gameCombatTimerValueMap'].get(testGameId)).toBe(duration);
            expect(mockTurnLogicService.pauseTurnTimer).toHaveBeenCalledWith(testGameId);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerStart, duration);
        });

        it('should decrement timer on interval and emit tick event', () => {
            const duration = 10;
            service.startCombatTimer(testGameId, duration, false);

            runIntervalCallback();

            expect(service['gameCombatTimerValueMap'].get(testGameId)).toBe(duration - 1);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerTick, duration - 1);
        });

        it('should execute auto attack when timer reaches zero', () => {
            testPlayers[0]._id = testPlayer1Id;
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);
            service['combatParticipantsMap'].set(testGameId, {
                firstPlayerToAttack: testPlayer1Id,
                secondPlayerToAttack: testPlayer2Id,
            });

            const executeAutoAttackSpy = jest.spyOn(service, 'executeAutoAttack').mockImplementation(jest.fn());

            service.startCombatTimer(testGameId, 1, false);

            runIntervalCallback();

            expect(service['gameCombatTimerValueMap'].get(testGameId)).toBe(0);
            expect(executeAutoAttackSpy).toHaveBeenCalledWith(testGameId, 0);
        });

        // it('should handle case when timer value is not set', () => {
        //     testPlayers[0]._id = testPlayer1Id;
        //     service['currentCombatantMap'].set(testGameId, testPlayer1Id);
        //     service['combatParticipantsMap'].set(testGameId, {
        //         firstPlayerToAttack: testPlayer1Id,
        //         secondPlayerToAttack: testPlayer2Id,
        //     });

        //     service.startCombatTimer(testGameId, 1, false);
        //     service['gameCombatTimerValueMap'].delete(testGameId);

        //     runIntervalCallback();

        //     expect(service['gameCombatTimerValueMap'].get(testGameId)).toBe(-1);
        // });
    });

    describe('executeAutoAttack', () => {
        beforeEach(() => {
            mockTurnLogicService.getPlayers.mockReturnValue(testPlayers);
            testPlayers[0]._id = testPlayer1Id;
            testPlayers[1]._id = testPlayer2Id;

            service['combatParticipantsMap'].set(testGameId, {
                firstPlayerToAttack: testPlayer1Id,
                secondPlayerToAttack: testPlayer2Id,
            });
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);
        });

        it('should emit auto attack event and proceed to next turn', () => {
            const nextCombatTurnSpy = jest.spyOn(service, 'nextCombatTurn').mockImplementation(jest.fn());

            service.executeAutoAttack(testGameId, 0);

            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.ExecuteAutoAttack);
            expect(nextCombatTurnSpy).toHaveBeenCalledWith(testGameId);
        });

        it('should do nothing if combat info or player is missing', () => {
            service['combatParticipantsMap'].delete(testGameId);
            const nextCombatTurnSpy = jest.spyOn(service, 'nextCombatTurn');

            service.executeAutoAttack(testGameId, 0);

            expect(nextCombatTurnSpy).not.toHaveBeenCalled();
        });
    });

    describe('clearCombatTimer', () => {
        it('should clear the combat timer interval', () => {
            const mockInterval = {} as NodeJS.Timeout;
            service['gameCombatTimerIntervalMap'].set(testGameId, mockInterval);

            service.clearCombatTimer(testGameId);

            expect(clearInterval).toHaveBeenCalledWith(mockInterval);
            expect(service['gameCombatTimerIntervalMap'].has(testGameId)).toBe(false);
        });

        it('should do nothing if no timer exists', () => {
            service.clearCombatTimer(testGameId);

            expect(clearInterval).not.toHaveBeenCalled();
        });
    });

    describe('endCombat', () => {
        it('should clear timer and reset combat state', () => {
            mockTurnLogicService.getPlayers.mockReturnValue(testPlayers);
            testPlayers[0].isCombatTurn = true;
            testPlayers[1].isCombatTurn = true;

            const clearCombatTimerSpy = jest.spyOn(service, 'clearCombatTimer').mockImplementation(jest.fn());
            service['combatActive'].set(testGameId, true);
            service['combatParticipantsMap'].set(testGameId, { firstPlayerToAttack: testPlayer1Id, secondPlayerToAttack: testPlayer2Id });
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);

            service.endCombat(testGameId);

            expect(clearCombatTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(mockTurnLogicService.resumeTurnTimer).toHaveBeenCalledWith(testGameId);
            expect(service['combatActive'].get(testGameId)).toBe(false);
            expect(service['combatParticipantsMap'].has(testGameId)).toBe(false);
            expect(service['currentCombatantMap'].has(testGameId)).toBe(false);
            expect(testPlayers[0].isCombatTurn).toBe(false);
            expect(testPlayers[1].isCombatTurn).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerEnd);
        });

        it('should handle case when players not found', () => {
            mockTurnLogicService.getPlayers.mockReturnValue(undefined);

            service.endCombat(testGameId);

            expect(mockTurnLogicService.resumeTurnTimer).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerEnd);
        });
    });

    describe('cleanupGame', () => {
        it('should clear all game data', () => {
            const clearCombatTimerSpy = jest.spyOn(service, 'clearCombatTimer').mockImplementation(jest.fn());
            service['gameCombatTimerValueMap'].set(testGameId, 1);
            service['combatActive'].set(testGameId, true);
            service['combatParticipantsMap'].set(testGameId, { firstPlayerToAttack: testPlayer1Id, secondPlayerToAttack: testPlayer2Id });
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);

            service.cleanupGame(testGameId);

            expect(clearCombatTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(service['gameCombatTimerValueMap'].has(testGameId)).toBe(false);
            expect(service['combatActive'].has(testGameId)).toBe(false);
            expect(service['combatParticipantsMap'].has(testGameId)).toBe(false);
            expect(service['currentCombatantMap'].has(testGameId)).toBe(false);
        });
    });

    describe('isCombatActive', () => {
        it('should return true when combat is active', () => {
            service['combatActive'].set(testGameId, true);

            expect(service.isCombatActive(testGameId)).toBe(true);
        });

        it('should return false when combat is not active', () => {
            expect(service.isCombatActive(testGameId)).toBe(false);
        });
    });

    describe('getCurrentCombatTurnPlayer', () => {
        it('should return the current player ID', () => {
            service['currentCombatantMap'].set(testGameId, testPlayer1Id);

            expect(service.getCurrentCombatTurnPlayer(testGameId)).toBe(testPlayer1Id);
        });

        it('should return undefined when no current player', () => {
            expect(service.getCurrentCombatTurnPlayer(testGameId)).toBeUndefined();
        });
    });

    // describe('getCurrentCombat', () => {
    //     it('should return combat participants when combat is active', () => {
    //         service['combatActive'].set(testGameId, true);
    //         service['combatParticipantsMap'].set(testGameId, {
    //             firstPlayerToAttack: testPlayer1Id,
    //             secondPlayerToAttack: testPlayer2Id,
    //         });

    //         expect(service.getCurrentCombat(testGameId)).toEqual({
    //             player1Id: testPlayer1Id,
    //             player2Id: testPlayer2Id,
    //         });
    //     });

    //     it('should return null when combat is not active', () => {
    //         expect(service.getCurrentCombat(testGameId)).toBeNull();
    //     });

    //     it('should return null when participants not found', () => {
    //         service['combatActive'].set(testGameId, true);

    //         expect(service.getCurrentCombat(testGameId)).toBeNull();
    //     });
    // });
});
