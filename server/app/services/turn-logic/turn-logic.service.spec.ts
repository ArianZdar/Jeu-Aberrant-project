/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { TRANSITION_DELAY, TURN_TIMER } from '@app/constants/server-constants';
import { DELAY_BEFORE_EMITTING_TIME } from '@app/gateways/common/gateway.constants';
import { ChatService } from '@app/services/chat/chat.service';
import { Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { mockPlayers } from '@common/player/mock-player';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { TurnLogicService } from './turn-logic.service';

describe('TurnLogicService', () => {
    let service: TurnLogicService;
    let mockServer: jest.Mocked<Server>;
    let mockChatService: jest.Mocked<ChatService>;
    const testGameId = 'test-game-id';
    const testPlayerId = 'player1';
    let testPlayers: Player[];
    let setTimeoutCallbacks: { callback: () => void; delay: number }[] = [];
    let setIntervalCallbacks: { callback: () => void; delay: number }[] = [];

    beforeEach(async () => {
        setTimeoutCallbacks = [];
        setIntervalCallbacks = [];

        mockServer = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        mockChatService = {
            setServer: jest.fn(),
            nextTurnEvent: jest.fn(),
        } as unknown as jest.Mocked<ChatService>;

        testPlayers = JSON.parse(JSON.stringify(mockPlayers));

        const module: TestingModule = await Test.createTestingModule({
            providers: [TurnLogicService, { provide: ChatService, useValue: mockChatService }],
        }).compile();

        service = module.get<TurnLogicService>(TurnLogicService);
        service.setServer(mockServer);

        jest.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
            const timeoutId = {} as NodeJS.Timeout;
            setTimeoutCallbacks.push({ callback: callback as () => void, delay: delay as number });
            return timeoutId;
        });

        jest.spyOn(global, 'setInterval').mockImplementation((callback, delay) => {
            const intervalId = {} as NodeJS.Timeout;
            setIntervalCallbacks.push({ callback: callback as () => void, delay: delay as number });
            return intervalId;
        });

        jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);
        jest.spyOn(global, 'clearInterval').mockImplementation(() => undefined);
    });

    const runTimeoutCallback = (index = 0) => {
        if (setTimeoutCallbacks[index]) {
            setTimeoutCallbacks[index].callback();
        }
    };

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('startGame', () => {
        it('should initialize game with players and start first turn', () => {
            const startTurnSpy = jest.spyOn(service, 'startTurn').mockImplementation(() => undefined);
            const pauseTurnTimerSpy = jest.spyOn(service, 'pauseTurnTimer').mockImplementation(() => undefined);

            service['transitionToNextPlayer'] = jest.fn().mockImplementation(() => undefined);

            const result = service.startGame(testGameId, testPlayers);

            expect(result).toEqual(testPlayers);
            expect(startTurnSpy).toHaveBeenCalledWith(testGameId, testPlayers[0]._id, true);
            expect(pauseTurnTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(service['transitionToNextPlayer']).toHaveBeenCalledWith(testGameId, testPlayers[0]._id);

            expect(testPlayers.every((player) => player.isTurn === false)).toBe(true);
        });
    });

    describe('startTurn', () => {
        it('should set isTurn to true for the specified player and start timer', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            const startTimerSpy = jest.spyOn(service, 'startTimer').mockImplementation(() => undefined);

            service.startTurn(testGameId, testPlayerId);

            const player = testPlayers.find((p) => p._id === testPlayerId);
            expect(player.isTurn).toBe(true);
            expect(startTimerSpy).toHaveBeenCalledWith(testGameId);
        });

        it('should emit delayed TurnStart event when isFirstTurn is true', () => {
            // Arrange
            jest.useFakeTimers();
            service['gamePlayersMap'].set(testGameId, testPlayers);
            const emitSpy = jest.spyOn(mockServer, 'emit');

            // Act
            service.startTurn(testGameId, testPlayerId, true);

            // Assert - event shouldn't be emitted immediately
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(emitSpy).not.toHaveBeenCalledWith(GameGatewayEvents.TurnStart, testPlayerId);

            // Fast-forward timer
            jest.advanceTimersByTime(DELAY_BEFORE_EMITTING_TIME);

            // Assert - event should be emitted after delay
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(emitSpy).toHaveBeenCalledWith(GameGatewayEvents.TurnStart, testPlayerId);

            jest.useRealTimers();
        });

        it('should do nothing if players not found for game', () => {
            service.startTurn('non-existent-game', testPlayerId);

            expect(testPlayers.find((p) => p._id === testPlayerId).isTurn).toBe(false);
        });

        it('should do nothing if player not found', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            const startTimerSpy = jest.spyOn(service, 'startTimer').mockImplementation(() => undefined);

            service.startTurn(testGameId, 'non-existent-player');

            expect(startTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(testPlayers.every((player) => player.isTurn === false)).toBe(true);
        });
    });

    describe('endTurn', () => {
        it('should return early if players not found for the game', () => {
            const serverEmitSpy = jest.spyOn(mockServer, 'emit');
            service.endTurn(testGameId, testPlayerId);

            expect(serverEmitSpy).not.toHaveBeenCalled();
        });

        it('should set player turn to false and reset player stats', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            testPlayers[0].isTurn = true;
            testPlayers[0].speed = 1;
            testPlayers[0].actionPoints = 1;

            service.endTurn(testGameId, testPlayerId);

            expect(testPlayers[0].isTurn).toBe(false);
            expect(testPlayers[0].speed).toBe(testPlayers[0].maxSpeed);
            expect(testPlayers[0].actionPoints).toBe(testPlayers[0].maxActionPoints);
        });

        it('should trigger team win when player with flag is on spawn point', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            testPlayers[0].isTurn = true;
            testPlayers[0].hasFlag = true;
            testPlayers[0].team = Teams.BlueSide;
            testPlayers[0].position = { x: 5, y: 5 };
            testPlayers[0].spawnPointPosition = { x: 5, y: 5 };

            service.endTurn(testGameId, testPlayerId);

            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TeamWon, Teams.BlueSide);
            expect(testPlayers[0].isWinner).toBe(true);
            expect(testPlayers[1].isWinner).toBe(false);
        });

        it('should not trigger team win when player with flag is not on spawn point', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            testPlayers[0].isTurn = true;
            testPlayers[0].hasFlag = true;
            testPlayers[0].team = Teams.BlueSide;
            testPlayers[0].position = { x: 5, y: 5 };
            testPlayers[0].spawnPointPosition = { x: 6, y: 6 };

            service.endTurn(testGameId, testPlayerId);

            expect(mockServer.emit).not.toHaveBeenCalledWith(GameGatewayEvents.TeamWon, expect.any(String));
            expect(testPlayers[0].isWinner).toBe(false);
        });

        it('should not trigger team win when player without flag is on spawn point', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            testPlayers[0].isTurn = true;
            testPlayers[0].hasFlag = false;
            testPlayers[0].team = Teams.BlueSide;
            testPlayers[0].position = { x: 5, y: 5 };
            testPlayers[0].spawnPointPosition = { x: 5, y: 5 };

            service.endTurn(testGameId, testPlayerId);

            expect(mockServer.emit).not.toHaveBeenCalledWith(GameGatewayEvents.TeamWon, expect.any(String));
            expect(testPlayers[0].isWinner).toBe(false);
        });
    });

    describe('resumeTurnTimer and pauseTurnTimer', () => {
        it('should resume the timer and update the pause state', () => {
            service['gameTurnTimerPausedMap'].set(testGameId, true);

            service.resumeTurnTimer(testGameId);

            expect(service['gameTurnTimerPausedMap'].get(testGameId)).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTimerPaused, false);
        });

        it('should pause the timer and update the pause state', () => {
            service['gameTurnTimerPausedMap'].set(testGameId, false);

            service.pauseTurnTimer(testGameId);

            expect(service['gameTurnTimerPausedMap'].get(testGameId)).toBe(true);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTimerPaused, true);
        });
    });

    describe('endBotTurn', () => {
        it('should trigger next turn and emit TurnChanged event', () => {
            const nextTurnSpy = jest.spyOn(service, 'nextTurn').mockReturnValue('player2');

            service.endBotTurn(testGameId);

            expect(nextTurnSpy).toHaveBeenCalledWith(testGameId);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, 'player2');
        });
    });

    describe('transitionToNextPlayer', () => {
        it('should emit chat event with player name and update player turn', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            const startTurnSpy = jest.spyOn(service, 'startTurn').mockImplementation(() => undefined);

            service['transitionToNextPlayer'](testGameId, testPlayers[1]._id);

            expect(mockChatService.nextTurnEvent).toHaveBeenCalledWith(testGameId, testPlayers[1].name, testPlayers[1]._id);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTransition, testPlayers[1]._id);
            expect(startTurnSpy).toHaveBeenCalledWith(testGameId, testPlayers[1]._id);
        });

        it('should not emit chat event if player not found', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);

            service['transitionToNextPlayer'](testGameId, 'non-existent-player');

            expect(mockChatService.nextTurnEvent).not.toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTransition, 'non-existent-player');
        });

        it('should schedule timer resume after transition delay', () => {
            jest.useFakeTimers();
            const resumeTurnTimerSpy = jest.spyOn(service, 'resumeTurnTimer').mockImplementation(() => undefined);

            service['transitionToNextPlayer'](testGameId, testPlayerId);

            expect(resumeTurnTimerSpy).not.toHaveBeenCalled();

            jest.advanceTimersByTime(TRANSITION_DELAY);

            expect(resumeTurnTimerSpy).toHaveBeenCalledWith(testGameId);
            jest.useRealTimers();
        });
    });

    describe('startTurn with isFirstTurn', () => {
        it('should delay TurnStart event when isFirstTurn is true', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);

            service.startTurn(testGameId, testPlayerId, true);

            expect(mockServer.emit).not.toHaveBeenCalledWith(GameGatewayEvents.TurnStart, testPlayerId);

            runTimeoutCallback();

            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnStart, testPlayerId);
        });

        it('should send TurnStart event immediately when isFirstTurn is false', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);

            service.startTurn(testGameId, testPlayerId, false);

            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnStart, testPlayerId);
        });
    });

    describe('nextTurn', () => {
        it('should move to the next player in the sequence', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].set(testGameId, 0);
            const endTurnSpy = jest.spyOn(service, 'endTurn');

            service['transitionToNextPlayer'] = jest.fn();

            const nextPlayerId = service.nextTurn(testGameId);

            expect(nextPlayerId).toBe(testPlayers[1]._id);
            expect(endTurnSpy).toHaveBeenCalledWith(testGameId, testPlayers[0]._id);
            expect(service['transitionToNextPlayer']).toHaveBeenCalledWith(testGameId, testPlayers[1]._id);
            expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBe(1);
        });

        it('should return empty string if all players are disconnected when currentPlayerIndex is undefined', () => {
            const disconnectedPlayers = JSON.parse(JSON.stringify(testPlayers));
            disconnectedPlayers.forEach((player) => (player.isConnected = false));

            service['gamePlayersMap'].set(testGameId, disconnectedPlayers);
            service['gameCurrentPlayerIndexMap'].delete(testGameId);

            const result = service.nextTurn(testGameId);

            expect(result).toBe('');
        });

        it('should skip disconnected players', () => {
            testPlayers[1].isConnected = false;
            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].set(testGameId, 0);

            service['transitionToNextPlayer'] = jest.fn();

            const nextPlayerId = service.nextTurn(testGameId);

            expect(nextPlayerId).toBe(testPlayers[2]._id);
            expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBe(2);
        });

        it('should loop back to the beginning after last player', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].set(testGameId, 2);

            service['transitionToNextPlayer'] = jest.fn();

            const nextPlayerId = service.nextTurn(testGameId);

            expect(nextPlayerId).toBe(testPlayers[0]._id);
            expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBe(0);
        });

        it('should initialize player index if undefined', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].delete(testGameId);

            service['transitionToNextPlayer'] = jest.fn();

            const nextPlayerId = service.nextTurn(testGameId);

            expect(nextPlayerId).not.toBe('');
            expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBeDefined();
        });
        it('should return empty string when players array is empty', () => {
            service['gamePlayersMap'].set(testGameId, []);
            const result = service.nextTurn(testGameId);
            expect(result).toBe('');
        });

        it('should return empty string if no connected players found', () => {
            const disconnectedPlayers = JSON.parse(JSON.stringify(testPlayers));
            disconnectedPlayers.forEach((player) => (player.isConnected = false));

            service['gamePlayersMap'].set(testGameId, disconnectedPlayers);
            service['gameCurrentPlayerIndexMap'].set(testGameId, 0);

            const result = service.nextTurn(testGameId);
            expect(result).toBe('');
        });

        it('should find first connected player when currentPlayerIndex is undefined', () => {
            testPlayers[0].isConnected = false;
            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].delete(testGameId);

            service['transitionToNextPlayer'] = jest.fn();

            const result = service.nextTurn(testGameId);
            expect(result).toBe(testPlayers[1]._id);
            expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBe(1);
        });
    });

    describe('startTimer', () => {
        let runIntervalCallback: () => void;

        beforeEach(() => {
            runIntervalCallback = () => {
                if (setIntervalCallbacks[0]) {
                    setIntervalCallbacks[0].callback();
                }
            };
        });

        it('should use TURN_TIMER as default when timer value is undefined', () => {
            service['gameTurnTimerValueMap'].delete(testGameId);
            service.startTimer(testGameId);

            service['gameTurnTimerValueMap'].delete(testGameId);

            if (setIntervalCallbacks[0]) {
                setIntervalCallbacks[0].callback();
            }

            expect(service['gameTurnTimerValueMap'].get(testGameId)).toBe(TURN_TIMER - 1);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TimerTick, TURN_TIMER - 1);
        });

        it('should initialize timer and emit initial timer value', () => {
            const clearTimerSpy = jest
                .spyOn(service as unknown as { clearTimer: (gameId: string) => void }, 'clearTimer')
                .mockImplementation(() => undefined);

            service.startTimer(testGameId);

            expect(clearTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(service['gameTurnTimerValueMap'].get(testGameId)).toBe(TURN_TIMER);
            expect(service['gameTurnTimerPausedMap'].get(testGameId)).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TimerTick, TURN_TIMER);
        });

        it('should decrement timer value on interval callback', () => {
            service.startTimer(testGameId);
            service['gameTurnTimerValueMap'].set(testGameId, TURN_TIMER);

            runIntervalCallback();

            expect(service['gameTurnTimerValueMap'].get(testGameId)).toBe(TURN_TIMER - 1);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TimerTick, TURN_TIMER - 1);
        });

        it('should not decrement timer when paused', () => {
            service.startTimer(testGameId);
            service['gameTurnTimerValueMap'].set(testGameId, TURN_TIMER);
            service['gameTurnTimerPausedMap'].set(testGameId, true);

            runIntervalCallback();

            expect(service['gameTurnTimerValueMap'].get(testGameId)).toBe(TURN_TIMER);
        });

        it('should end turn when timer reaches zero', () => {
            const clearTimerSpy = jest
                .spyOn(service as unknown as { clearTimer: (gameId: string) => void }, 'clearTimer')
                .mockImplementation(() => undefined);
            const nextTurnSpy = jest.spyOn(service, 'nextTurn').mockReturnValue(testPlayerId);

            service.startTimer(testGameId);
            service['gameTurnTimerValueMap'].set(testGameId, 1);

            runIntervalCallback();

            expect(service['gameTurnTimerValueMap'].get(testGameId)).toBe(0);
            expect(clearTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(nextTurnSpy).toHaveBeenCalledWith(testGameId);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, testPlayerId);
        });

        it('should handle timeout callback', () => {
            const clearTimerSpy = jest
                .spyOn(service as unknown as { clearTimer: (gameId: string) => void }, 'clearTimer')
                .mockImplementation(() => undefined);
            const nextTurnSpy = jest.spyOn(service, 'nextTurn').mockReturnValue(testPlayerId);

            service.startTimer(testGameId);

            runTimeoutCallback();

            expect(clearTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(nextTurnSpy).toHaveBeenCalledWith(testGameId);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, testPlayerId);
        });

        it('should not handle timeout if timer is paused', () => {
            const clearTimerSpy = jest
                .spyOn(service as unknown as { clearTimer: (gameId: string) => void }, 'clearTimer')
                .mockImplementation(() => undefined);

            service.startTimer(testGameId);

            clearTimerSpy.mockClear();

            service['gameTurnTimerPausedMap'].set(testGameId, true);
            const nextTurnSpy = jest.spyOn(service, 'nextTurn');

            runTimeoutCallback();

            expect(clearTimerSpy).not.toHaveBeenCalled();
            expect(nextTurnSpy).not.toHaveBeenCalled();
        });
    });

    it('should return empty string when players array is empty', () => {
        service['gamePlayersMap'].set(testGameId, []);
        const result = service.nextTurn(testGameId);
        expect(result).toBe('');
    });

    it('should return empty string if no connected players found', () => {
        const disconnectedPlayers = JSON.parse(JSON.stringify(testPlayers));
        disconnectedPlayers.forEach((player) => (player.isConnected = false));

        service['gamePlayersMap'].set(testGameId, disconnectedPlayers);
        service['gameCurrentPlayerIndexMap'].set(testGameId, 0);

        const result = service.nextTurn(testGameId);
        expect(result).toBe('');
    });

    it('should find first connected player when currentPlayerIndex is undefined', () => {
        testPlayers[0].isConnected = false;
        service['gamePlayersMap'].set(testGameId, testPlayers);
        service['gameCurrentPlayerIndexMap'].delete(testGameId);

        service['transitionToNextPlayer'] = jest.fn();

        const result = service.nextTurn(testGameId);
        expect(result).toBe(testPlayers[1]._id);
        expect(service['gameCurrentPlayerIndexMap'].get(testGameId)).toBe(1);
    });

    describe('clearTimer', () => {
        it('should clear both timeout and interval', () => {
            const mockTimeout = {} as NodeJS.Timeout;
            const mockInterval = {} as NodeJS.Timeout;

            service['gameTurnTimeoutTimerMap'].set(testGameId, mockTimeout);
            service['gameTurnTimerIntervalMap'].set(testGameId, mockInterval);

            service['clearTimer'](testGameId);

            expect(clearTimeout).toHaveBeenCalledWith(mockTimeout);
            expect(clearInterval).toHaveBeenCalledWith(mockInterval);
            expect(service['gameTurnTimeoutTimerMap'].has(testGameId)).toBe(false);
            expect(service['gameTurnTimerIntervalMap'].has(testGameId)).toBe(false);
        });

        it('should handle case when timers do not exist', () => {
            service['clearTimer'](testGameId);

            expect(clearTimeout).not.toHaveBeenCalled();
            expect(clearInterval).not.toHaveBeenCalled();
        });
    });

    describe('transitionToNextPlayer', () => {
        it('should emit transition event, start turn and handle timer', () => {
            const startTurnSpy = jest.spyOn(service, 'startTurn').mockImplementation(() => undefined);
            const pauseTurnTimerSpy = jest.spyOn(service, 'pauseTurnTimer').mockImplementation(() => undefined);
            const resumeTurnTimerSpy = jest.spyOn(service, 'resumeTurnTimer').mockImplementation(() => undefined);

            service['transitionToNextPlayer'](testGameId, testPlayerId);

            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTransition, testPlayerId);
            expect(startTurnSpy).toHaveBeenCalledWith(testGameId, testPlayerId);
            expect(pauseTurnTimerSpy).toHaveBeenCalledWith(testGameId);

            expect(setTimeout).toHaveBeenCalledWith(expect.any(Function), TRANSITION_DELAY);
            runTimeoutCallback();
            expect(resumeTurnTimerSpy).toHaveBeenCalledWith(testGameId);
        });
    });

    describe('updatePlayers', () => {
        it('should update players in the game map', () => {
            const updatedPlayers = JSON.parse(JSON.stringify(testPlayers));
            updatedPlayers[0].healthPower = 2;

            service.updatePlayers(testGameId, updatedPlayers);

            expect(service['gamePlayersMap'].get(testGameId)).toEqual(updatedPlayers);
            expect(service['gamePlayersMap'].get(testGameId)).not.toBe(updatedPlayers);
        });
    });

    describe('getPlayers', () => {
        it('should return players for a game id', () => {
            service['gamePlayersMap'].set(testGameId, testPlayers);

            const result = service.getPlayers(testGameId);

            expect(result).toEqual(testPlayers);
        });

        it('should return undefined for non-existent game', () => {
            const result = service.getPlayers('non-existent-game');

            expect(result).toBeUndefined();
        });
    });

    describe('pauseTurnTimer', () => {
        it('should pause the turn timer and emit event', () => {
            service.pauseTurnTimer(testGameId);

            expect(service['gameTurnTimerPausedMap'].get(testGameId)).toBe(true);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTimerPaused, true);
        });
    });

    describe('resumeTurnTimer', () => {
        it('should resume the turn timer and emit event', () => {
            service.resumeTurnTimer(testGameId);

            expect(service['gameTurnTimerPausedMap'].get(testGameId)).toBe(false);
            expect(mockServer.to).toHaveBeenCalledWith(testGameId);
            expect(mockServer.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnTimerPaused, false);
        });
    });

    describe('cleanupGame', () => {
        it('should clear timer and remove game data', () => {
            const clearTimerSpy = jest
                .spyOn(service as unknown as { clearTimer: (gameId: string) => void }, 'clearTimer')
                .mockImplementation(() => undefined);

            service['gamePlayersMap'].set(testGameId, testPlayers);
            service['gameCurrentPlayerIndexMap'].set(testGameId, 0);
            service['gameTurnTimerValueMap'].set(testGameId, 1);
            service['gameTurnTimerPausedMap'].set(testGameId, true);

            service.cleanupGame(testGameId);

            expect(clearTimerSpy).toHaveBeenCalledWith(testGameId);
            expect(service['gamePlayersMap'].has(testGameId)).toBe(false);
            expect(service['gameCurrentPlayerIndexMap'].has(testGameId)).toBe(false);
            expect(service['gameTurnTimerValueMap'].has(testGameId)).toBe(false);
            expect(service['gameTurnTimerPausedMap'].has(testGameId)).toBe(false);
        });
    });
});
