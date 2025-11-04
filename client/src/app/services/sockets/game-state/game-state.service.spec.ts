/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MS_OF_ONE_AND_HALF_SECOND, TRANSITION_DELAY_IN_MS } from '@app/constants/client-constants';
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TurnNotificationComponent } from '@app/components/game-page-components/turn-notification/turn-notification.component';
import { mockCoordinateList, mockGameConfig, mockPlayers, mockGameItem, mockGameItems, repeatNumber } from '@app/constants/mocks';
import { PlayerService } from '@app/services/player/player.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { Coordinate } from '@common/game/game-info';
import { CommonGatewayEvents, GameGatewayEvents, ActionJournalEvents } from '@common/events/gateway-events';
import { Socket } from 'socket.io-client';
import { GameStateService } from './game-state.service';
import { ChatMessage } from '@common/game/message';
import { Teams } from '@common/game/game-enums';
import { Player } from '@common/player/player';

const INITIAL_TIMER_VALUE = 10;
const MID_TIMER_VALUE = 5;
const RESET_TIMER_VALUE = 0;
const DEFAULT_NEGATIVE_VALUE = -1;
const DIALOG_WIDTH = '30vh';

describe('GameStateService', () => {
    let service: GameStateService;
    let socketSpy: jasmine.SpyObj<Socket>;
    let playerServiceSpy: jasmine.SpyObj<PlayerService>;
    let lobbyServiceSpy: jasmine.SpyObj<LobbyService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<TurnNotificationComponent>>;

    beforeEach(() => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close', 'componentInstance']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        dialogSpy.open.and.returnValue(dialogRefSpy);

        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on', 'off', 'disconnect', 'connect', 'once']);
        Object.defineProperty(socketSpy, 'id', { value: 'test-socket-id', configurable: true });
        Object.defineProperty(socketSpy, 'connected', { value: true, configurable: true });

        playerServiceSpy = jasmine.createSpyObj(
            'PlayerService',
            ['setMainPlayerId', 'getMainPlayer', 'getMainPlayerId', 'setMainPlayer', 'setPlayers'],
            { players: mockPlayers },
        );
        playerServiceSpy.getMainPlayer.and.returnValue(mockPlayers[0]);

        lobbyServiceSpy = jasmine.createSpyObj('LobbyService', ['isSocketAlive', 'disconnect', 'getSocketId']);
        lobbyServiceSpy.getSocketId.and.returnValue('lobby-socket-id');

        TestBed.configureTestingModule({
            imports: [MatDialogModule],
            providers: [
                GameStateService,
                { provide: PlayerService, useValue: playerServiceSpy },
                { provide: LobbyService, useValue: lobbyServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        });

        service = TestBed.inject(GameStateService);
        spyOn(service, 'connect').and.callFake(() => {
            Reflect.set(service, 'socket', socketSpy);
        });
        service.connect();
    });

    describe('Socket connection and basics', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should check if socket is alive', () => {
            expect(service.isSocketAlive()).toBeTrue();
            Object.defineProperty(socketSpy, 'connected', { value: false, configurable: true });
            expect(service.isSocketAlive()).toBeFalse();
            Reflect.set(service, 'socket', undefined);
            expect(service.isSocketAlive()).toBeFalse();
        });

        it('should get socket', () => {
            expect(service.getSocket()).toBe(socketSpy);
            Reflect.set(service, 'socket', undefined);
            expect(service.getSocket()).toBeNull();
        });

        it('should get socket ID', () => {
            expect(service.getSocketId()).toBe('test-socket-id');
            Reflect.set(service, 'socket', undefined);
            expect(service.getSocketId()).toBe('');
        });

        it('should disconnect socket', () => {
            service.disconnect();
            expect(socketSpy.disconnect).toHaveBeenCalled();
        });

        it('should connect with lobby socket ID', () => {
            (service.connect as jasmine.Spy).and.callThrough();
            service.connect();
            expect(lobbyServiceSpy.getSocketId).toHaveBeenCalled();
        });

        it('should register event listeners with on method', () => {
            const callback = jasmine.createSpy('callback');
            service.on('testEvent', callback);
            expect(socketSpy.on).toHaveBeenCalledWith('testEvent', callback);
        });

        it('should remove event listeners with off method', () => {
            service.off('testEvent');
            expect(socketSpy.off).toHaveBeenCalledWith('testEvent');
        });
    });

    describe('Game creation and management', () => {
        it('should create a game', async () => {
            const mockResponse = { success: true, gameId: 'test-game-id' };
            socketSpy.emit.and.callFake((event, data, callback) => {
                if (event === GameGatewayEvents.CreateGame) {
                    callback(mockResponse);
                }
                return socketSpy;
            });
            const result = await service.createGame(mockGameConfig);
            expect(result).toBe('test-game-id');
            expect(service.getCurrentGameId()).toBe('test-game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.CreateGame, mockGameConfig, jasmine.any(Function));
        });

        it('should join a game and setup socket listeners', async () => {
            spyOn<any>(service, 'setupSocketListeners');
            await service.joinGame('test-game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.JoinGame, 'test-game-id');
            expect(service['setupSocketListeners']).toHaveBeenCalled();
        });

        it('should leave game', () => {
            service.leaveGame();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.LeaveGame);
        });
    });

    describe('setter and getter for gameId', () => {
        it('should set and get current game ID', () => {
            const gameId = 'new-test-game-id';
            service.setCurrentGameId(gameId);
            expect(service.getCurrentGameId()).toBe(gameId);
        });
    });

    describe('game state management and players management', () => {
        it('should get players', async () => {
            socketSpy.emit.and.callFake((event, callback) => {
                if (event === GameGatewayEvents.GetPlayers) {
                    callback(mockPlayers);
                }
                return socketSpy;
            });
            const result = await service.getPlayers();
            expect(result).toEqual(mockPlayers);
            expect(playerServiceSpy.setMainPlayerId).toHaveBeenCalledWith('test-socket-id');
        });

        it('should get map ID', async () => {
            const mockMapId = 'test-map-id';
            socketSpy.emit.and.callFake((event, callback) => {
                if (event === GameGatewayEvents.GetMapId) {
                    callback(mockMapId);
                }
                return socketSpy;
            });
            const result = await service.getMapId();
            expect(result).toBe(mockMapId);
        });

        it('should get accessible tiles', async () => {
            const mockTiles = mockCoordinateList;
            socketSpy.emit.and.callFake((event, callback) => {
                if (event === GameGatewayEvents.GetAccessibleTiles) {
                    callback(mockTiles);
                }
                return socketSpy;
            });
            const result = await service.getAccessibleTiles();
            expect(result).toEqual(mockTiles);
        });

        it('should rebind socket ID', () => {
            service.rebindSocketId();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.RebindSocketId, {
                lobbySocketId: 'lobby-socket-id',
                gameSocketId: 'test-socket-id',
            });
        });

        it('should not rebind socket ID when socket ID is empty', () => {
            Object.defineProperty(socketSpy, 'id', { value: '' });
            service.rebindSocketId();
            expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.RebindSocketId, jasmine.any(Object));
        });
    });

    describe('Turn management', () => {
        it('should start turn', () => {
            service.startTurn('game-id', 'player-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.TurnStart, { gameId: 'game-id', playerId: 'player-id' });
        });

        it('should end turn', () => {
            service.endTurn('game-id', 'player-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.EndTurn, { gameId: 'game-id', playerId: 'player-id' });
        });

        it('should next turn', () => {
            service.nextTurn('game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.NextTurn, 'game-id');
        });

        it('should pause and resume turn timer', () => {
            service.pauseTurnTimer('game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.PauseTurnTimer, 'game-id');

            service.resumeTurnTimer('game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.ResumeTurnTimer, 'game-id');
        });

        it('should get turn timer paused status', () => {
            const testResult = service.getTurnTimerPaused();
            expect(testResult).toBeDefined();
        });
    });

    describe('Player movement', () => {
        it('should move player', async () => {
            const mockMovementInfo = {
                gameId: 'game-id',
                movingPlayerId: 'player-id',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 1, y: 1 },
            };
            socketSpy.emit.and.callFake((event, data, callback) => {
                if (event === GameGatewayEvents.MovePlayer) {
                    callback(true);
                }
                return socketSpy;
            });
            const result = await service.movePlayer(mockMovementInfo);
            expect(result).toBeTrue();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.MovePlayer, mockMovementInfo, jasmine.any(Function));
        });

        it('should get shortest path to tile', async () => {
            const destination: Coordinate = { x: 5, y: 5 };
            const expectedPath: Coordinate[] = [
                { x: 1, y: 1 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
                { x: 4, y: 4 },
                { x: 5, y: 5 },
            ];
            socketSpy.emit.and.callFake((event, data, callback) => {
                if (event === GameGatewayEvents.GetShortestPathToTile) {
                    callback({ path: expectedPath, firstItemOnPath: undefined });
                }
                return socketSpy;
            });

            const result = await service.getShortestPathToTile('game-id', 'player-id', destination);
            expect(result.path).toEqual(expectedPath);
            expect(socketSpy.emit).toHaveBeenCalledWith(
                GameGatewayEvents.GetShortestPathToTile,
                { gameId: 'game-id', playerId: 'player-id', destination },
                jasmine.any(Function),
            );
        });
    });

    describe('Combat management', () => {
        it('should start combat and handle opponent disconnected', async () => {
            await service.startCombat('target-id');
            const targetId = 'target-id';
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.StartCombat, targetId);

            await service.opponentDisconnected();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.OpponentDisconnected);
        });

        it('should send attack', async () => {
            await service.attack(false, 'target-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.PlayerAttack, { isAnAutoAttack: false, targetId: 'target-id' });
        });

        it('should make player lose combat', async () => {
            await service.makePlayerLoseCombat();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.MakePlayerLoseCombat);
        });

        it('should end combat', () => {
            service.endCombat('game-id');
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.EndCombat, 'game-id');
        });

        it('should forfeit combat', async () => {
            const mockResponse = { canEscape: true };
            socketSpy.emit.and.callFake((event, data, callback) => {
                if (event === GameGatewayEvents.AttemptEscape) {
                    callback(mockResponse);
                }
                return socketSpy;
            });
            const result = await service.forfeitCombat('target-id');
            expect(result).toBeTrue();
            const targetId = 'target-id';
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.AttemptEscape, targetId, jasmine.any(Function));
        });

        it('should get combat timer', () => {
            const testObservable = service.getCombatTimer();
            expect(testObservable).toBeDefined();
        });
    });

    describe('Environment interaction and Debug mode', () => {
        it('should use door', async () => {
            const doorPosition: Coordinate = { x: 3, y: 4 };
            await service.useDoor(doorPosition);
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.UseDoor, doorPosition);
        });

        it('should activate debug mode when player is leader', () => {
            playerServiceSpy.getMainPlayer.and.returnValue({ ...mockPlayers[0], isLeader: true });
            service.activateDebugMode();
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.ToggleDebug);
        });

        it('should not activate debug mode when player is not leader', () => {
            playerServiceSpy.getMainPlayer.and.returnValue({ ...mockPlayers[0], isLeader: false });
            service.activateDebugMode();
            expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.ToggleDebug);
        });

        it('should set debug active status and get player stats', () => {
            service.setIsDebugActive(true);
            let isActive = false;
            service.isDebugActive$.subscribe((value) => (isActive = value));
            expect(isActive).toBeTrue();

            service.setIsDebugActive(false);
            service.isDebugActive$.subscribe((value) => (isActive = value));
            expect(isActive).toBeFalse();

            const playerStats$ = service.getPlayerStats();
            expect(playerStats$).toBeDefined();
        });

        it('should break wall at specified coordinates', async () => {
            const wallPosition: Coordinate = { x: 2, y: 3 };
            await service.breakWall(wallPosition);
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.BreakWall, wallPosition);
        });
    });

    describe('Socket listeners', () => {
        it('should setup combat timer listeners correctly', () => {
            service['setupSocketListeners']();
            const eventHandlers: { [key: string]: any } = {};

            socketSpy.on.and.callFake(function (event, callback) {
                eventHandlers[event] = callback;
                return socketSpy;
            });

            service['setupSocketListeners']();

            eventHandlers[GameGatewayEvents.CombatTimerStart](INITIAL_TIMER_VALUE);
            let timerValue = RESET_TIMER_VALUE;
            service.combatTimer$.subscribe((value) => (timerValue = value));
            expect(timerValue).toBe(INITIAL_TIMER_VALUE);

            eventHandlers[GameGatewayEvents.CombatTimerTick](MID_TIMER_VALUE);
            service.combatTimer$.subscribe((value) => (timerValue = value));
            expect(timerValue).toBe(MID_TIMER_VALUE);

            eventHandlers[GameGatewayEvents.CombatTimerEnd](undefined);
            service.combatTimer$.subscribe((value) => (timerValue = value));
            expect(timerValue).toBe(RESET_TIMER_VALUE);

            eventHandlers[GameGatewayEvents.TurnTimerPaused](true);
            let isPaused = false;
            service.getTurnTimerPaused().subscribe((value: boolean) => (isPaused = value));
            expect(isPaused).toBeTrue();
        });

        it('should handle turn transition and combat events', () => {
            service['setupSocketListeners']();
            const eventHandlers: { [key: string]: any } = {};

            socketSpy.on.and.callFake(function (event, callback) {
                eventHandlers[event] = callback;
                return socketSpy;
            });

            service['setupSocketListeners']();

            jasmine.clock().install();
            eventHandlers[GameGatewayEvents.TurnTransition](mockPlayers[0]._id);
            expect(dialogSpy.open).toHaveBeenCalledWith(TurnNotificationComponent, {
                data: { playerName: mockPlayers[0].name },
                width: DIALOG_WIDTH,
                disableClose: false,
            });
            jasmine.clock().tick(TRANSITION_DELAY_IN_MS);
            expect(dialogRefSpy.close).toHaveBeenCalled();
            jasmine.clock().uninstall();

            const combatData = { attackerId: 'attacker-id', targetId: 'target-id' };
            spyOn((service as any).combatDataSubject, 'next').and.callThrough();
            eventHandlers[GameGatewayEvents.CombatStarted](combatData);
            expect((service as any).combatDataSubject.next).toHaveBeenCalledWith(combatData);
        });
    });

    describe('Service reset', () => {
        it('should reset all service state and remove listeners', () => {
            service.setCurrentGameId('test-game-id');
            (service as any).combatDataSubject.next({ attackerId: 'id1', targetId: 'id2' });
            service.playersUpdatedSubject.next(mockPlayers);
            service.combatTimerSubject.next(INITIAL_TIMER_VALUE);
            (service as any).turnTimerPausedSubject.next(true);
            (service as any).isDebugActiveSubject.next(true);

            service.reset();

            expect(service.getCurrentGameId()).toBe('');
            let combatData = null;
            service.combatData$.subscribe((data) => (combatData = data));
            expect(combatData).toBeNull();
            let timerValue = DEFAULT_NEGATIVE_VALUE;
            service.combatTimer$.subscribe((value) => (timerValue = value));
            expect(timerValue).toBe(RESET_TIMER_VALUE);
            let isPaused = true;
            (service as any).turnTimerPaused$.subscribe((value: boolean) => (isPaused = value));
            expect(isPaused).toBeFalse();
            let isDebugActive = true;
            service.isDebugActive$.subscribe((value) => (isDebugActive = value));
            expect(isDebugActive).toBeFalse();

            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.TurnTransition);
            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.CombatStarted);
            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.TurnTimerPaused);
            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerStart);
            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerTick);
            expect(socketSpy.off).toHaveBeenCalledWith(GameGatewayEvents.CombatTimerEnd);
        });
    });

    describe('emit pickup and drop items', () => {
        it('should emit pickup item event with correct coordinates', () => {
            const itemPosition: Coordinate = { x: 3, y: 4 };
            service.pickupItem(itemPosition);
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.PickupItem, itemPosition);
        });

        it('should emit drop item event with correct game item', () => {
            service.dropItem(mockGameItem);
            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.DropItem, mockGameItem);
        });
    });
    it('should get items from server and return them as a Set', async () => {
        const mockItemsArray = mockGameItems;
        socketSpy.emit.and.callFake((event, callback) => {
            if (event === GameGatewayEvents.GetItems) {
                callback(mockItemsArray);
            }
            return socketSpy;
        });
        const result = await service.getItems();
        expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.GetItems, jasmine.any(Function));
        expect(result).toBeInstanceOf(Set);
        expect(result.size).toBe(mockItemsArray.length);
        const resultArray = Array.from(result);
        for (const item of mockItemsArray) {
            expect(
                resultArray.some(
                    (resultItem) =>
                        resultItem.position.x === item.position.x && resultItem.position.y === item.position.y && resultItem.item === item.item,
                ),
            ).toBeTrue();
        }
    });
    describe('Chat functionality', () => {
        it('should send message to room', () => {
            const mockMessage: ChatMessage = {
                timeStamp: new Date().toISOString(),
                senderName: 'Test Player',
                senderId: 'test-socket-id',
                content: 'Hello, world!',
            };

            service.sendMessage(mockMessage);

            expect(socketSpy.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, mockMessage);
        });

        it('should send chat history request for a specific lobby', () => {
            const lobbyId = 'test-lobby-123';

            service.sendChatHistoryRequest(lobbyId);
            expect(socketSpy.emit).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, lobbyId);
        });

        it('should handle empty message content', () => {
            const mockMessage: ChatMessage = {
                timeStamp: new Date().toISOString(),
                senderName: 'Test Player',
                senderId: 'test-socket-id',
                content: '',
            };

            service.sendMessage(mockMessage);

            expect(socketSpy.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, mockMessage);
        });

        it('should handle long message content', () => {
            const longContent = 'A'.repeat(repeatNumber);
            const mockMessage: ChatMessage = {
                timeStamp: new Date().toISOString(),
                senderName: 'Test Player',
                senderId: 'test-socket-id',
                content: longContent,
            };
            service.sendMessage(mockMessage);
            expect(socketSpy.emit).toHaveBeenCalledWith(
                CommonGatewayEvents.RoomMessage,
                jasmine.objectContaining({
                    content: longContent,
                }),
            );
        });
    });

    it('should not emit BotTurn event when a human player turn starts', () => {
        const mockHumanPlayerId = 'human-player-123';

        playerServiceSpy.setPlayers(mockPlayers);

        socketSpy.emit.calls.reset();

        service.joinGame('some-game-id');

        const turnStartHandlers = socketSpy.on.calls
            .all()
            .filter((call) => call.args[0] === GameGatewayEvents.TurnStart)
            .map((call) => call.args[1]);

        const turnStartHandler = turnStartHandlers[0];
        turnStartHandler(mockHumanPlayerId);

        expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.BotTurn, jasmine.any(Object));
    });

    it('should handle case when player is not found', () => {
        const nonExistentPlayerId = 'non-existent-player';
        playerServiceSpy.setPlayers(mockPlayers);
        socketSpy.emit.calls.reset();
        service.joinGame('some-game-id');

        const turnStartHandlers = socketSpy.on.calls
            .all()
            .filter((call) => call.args[0] === GameGatewayEvents.TurnStart)
            .map((call) => call.args[1]);

        const turnStartHandler = turnStartHandlers[0];
        turnStartHandler(nonExistentPlayerId);

        expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.BotTurn, jasmine.any(Object));
    });

    it('should relay BotStartCombat event with same data', () => {
        socketSpy.emit.calls.reset();
        service['setupSocketListeners']();

        let botStartCombatHandler = jasmine.createSpy('botStartCombatHandler');
        socketSpy.on.and.callFake((event: string, callback: any) => {
            if (event === GameGatewayEvents.BotStartCombat) {
                botStartCombatHandler = callback;
            }
            return socketSpy;
        });

        service['setupSocketListeners']();
        expect(botStartCombatHandler).toBeDefined();

        const mockData = {
            attackerId: 'bot-123',
            targetId: 'player-456',
        };

        botStartCombatHandler(mockData);

        expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.BotStartCombat, mockData);
    });

    describe('firstPlayerTurn', () => {
        beforeEach(() => {
            jasmine.clock().install();
        });

        afterEach(() => {
            jasmine.clock().uninstall();
        });

        it('should emit InitialTurn event after delay when player is leader', () => {
            playerServiceSpy.getMainPlayer.and.returnValue({
                ...mockPlayers[0],
                isLeader: true,
            });

            service.firstPlayerTurn();

            expect(socketSpy.emit).not.toHaveBeenCalledWith(ActionJournalEvents.InitialTurn);

            jasmine.clock().tick(MS_OF_ONE_AND_HALF_SECOND);

            expect(socketSpy.emit).toHaveBeenCalledWith(ActionJournalEvents.InitialTurn);
        });

        it('should not emit InitialTurn event when player is not leader', () => {
            playerServiceSpy.getMainPlayer.and.returnValue({
                ...mockPlayers[0],
                isLeader: false,
            });

            service.firstPlayerTurn();

            jasmine.clock().tick(MS_OF_ONE_AND_HALF_SECOND);

            expect(socketSpy.emit).not.toHaveBeenCalledWith(ActionJournalEvents.InitialTurn);
        });

        it('should not emit InitialTurn when player is undefined', () => {
            playerServiceSpy.getMainPlayer.and.returnValue(undefined);

            service.firstPlayerTurn();

            jasmine.clock().tick(MS_OF_ONE_AND_HALF_SECOND);

            expect(socketSpy.emit).not.toHaveBeenCalledWith(ActionJournalEvents.InitialTurn);
        });
    });

    describe('TurnStart event handler', () => {
        let eventHandlers: { [key: string]: any };

        beforeEach(() => {
            service['setupSocketListeners']();
            eventHandlers = {};
            socketSpy.on.and.callFake(function (event, callback) {
                eventHandlers[event] = callback;
                return socketSpy;
            });
            service['setupSocketListeners']();
            socketSpy.emit.calls.reset();
        });

        it('should emit BotTurn event when a bot player turn starts', () => {
            const botPlayer: Player = {
                _id: 'bot-id',
                name: 'Bot Player',
                championName: 'BotChampion',
                healthPower: 10,
                maxHealthPower: 10,
                attackPower: 5,
                defensePower: 5,
                speed: 5,
                maxSpeed: 5,
                actionPoints: 1,
                maxActionPoints: 1,
                position: { x: 2, y: 2 },
                spawnPointPosition: { x: 2, y: 2 },
                isWinner: false,
                isBot: true,
                isAggressive: true,
                isLeader: false,
                isTurn: false,
                isConnected: true,
                nbFightsWon: 0,
                isCombatTurn: false,
                escapesAttempts: 0,
                team: Teams.None,
                hasFlag: false,
                isInCombat: false,
                items: [],
                buffs: { attackBuff: 0, defenseBuff: 0 },
                activeBuffs: [],
            };

            const playersWithBot = [...mockPlayers, botPlayer];
            playerServiceSpy.setPlayers(playersWithBot);
            Object.defineProperty(playerServiceSpy, 'players', { get: () => playersWithBot });

            service.setCurrentGameId('test-game-id');

            eventHandlers[GameGatewayEvents.TurnStart](botPlayer._id);

            expect(socketSpy.emit).toHaveBeenCalledWith(GameGatewayEvents.BotTurn, { gameId: 'test-game-id', playerId: botPlayer._id });
        });

        it('should NOT emit BotTurn event when a human player turn starts', () => {
            const humanPlayer = mockPlayers[0];
            playerServiceSpy.setPlayers(mockPlayers);
            Object.defineProperty(playerServiceSpy, 'players', { get: () => mockPlayers });

            eventHandlers[GameGatewayEvents.TurnStart](humanPlayer._id);

            expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.BotTurn, jasmine.any(Object));
        });

        it('should NOT emit BotTurn event when player is not found', () => {
            const nonExistentId = 'nonexistent-id';
            playerServiceSpy.setPlayers(mockPlayers);
            Object.defineProperty(playerServiceSpy, 'players', { get: () => mockPlayers });

            eventHandlers[GameGatewayEvents.TurnStart](nonExistentId);

            expect(socketSpy.emit).not.toHaveBeenCalledWith(GameGatewayEvents.BotTurn, jasmine.any(Object));
        });
    });
});
