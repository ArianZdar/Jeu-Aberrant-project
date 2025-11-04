/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { TestBed } from '@angular/core/testing';
import { ChatService } from './chat.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { BehaviorSubject } from 'rxjs';
import { CommonGatewayEvents, ActionJournalEvents } from '@common/events/gateway-events';
import { ChatMessage, JournalMessage } from '@common/game/message';
import { Lobby } from '@common/lobby/lobby-info';

describe('ChatService', () => {
    let service: ChatService;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateService>;
    let lobbyServiceSpy: jasmine.SpyObj<LobbyService>;
    let playerStateServiceSpy: jasmine.SpyObj<PlayerStateService>;

    const mockSocketId = 'socket-123';
    const mockLobbyCode = 'ABCD';
    const mockPlayerInfo = { name: 'TestPlayer', id: 'player-123' };

    const verifyCleanupWasCalled = () => {
        [CommonGatewayEvents.RoomMessage, CommonGatewayEvents.ChatHistory].forEach((event) => {
            expect(gameStateServiceSpy.off).toHaveBeenCalledWith(event);
            expect(lobbyServiceSpy.off).toHaveBeenCalledWith(event);
        });

        [
            ActionJournalEvents.CombatJournal,
            ActionJournalEvents.CombatJournalEnded,
            ActionJournalEvents.ToggleDebugJournal,
            ActionJournalEvents.LeaveGameJournal,
            ActionJournalEvents.DoorToggleJournal,
            ActionJournalEvents.TurnJournalTransition,
            ActionJournalEvents.CombatEscapeAttemptJournal,
            ActionJournalEvents.CombatEscapeAttemptJournalFailed,
            ActionJournalEvents.AttackJournalResult,
            ActionJournalEvents.ItemPickedUp,
        ].forEach((event) => {
            expect(gameStateServiceSpy.off).toHaveBeenCalledWith(event);
        });
    };
    beforeEach(() => {
        service = jasmine.createSpyObj(
            'ChatService',
            [
                'sendChatMessage',
                'requestLobbyChatHistory',
                'resetToLobbyMode',
                'getCurrentPlayerId',
                'enterAGame',
                'setupLobbyListeners',
                'setupGameListeners',
                'cleanupListeners',
            ],
            {
                messages$: new BehaviorSubject([]),
                journalMessages$: new BehaviorSubject([]),
                currentPlayerName$: new BehaviorSubject('TestPlayer'),
            },
        );

        gameStateServiceSpy = jasmine.createSpyObj('GameStateService', [
            'getSocket',
            'sendMessage',
            'sendChatHistoryRequest',
            'on',
            'off',
            'firstPlayerTurn',
        ]);

        lobbyServiceSpy = jasmine.createSpyObj('LobbyService', ['getSocket', 'sendMessage', 'sendChatHistoryRequest', 'on', 'off']);

        playerStateServiceSpy = jasmine.createSpyObj('PlayerStateService', ['getLobbyData'], {
            playerInfo$: new BehaviorSubject(mockPlayerInfo),
        });

        gameStateServiceSpy.getSocket.and.returnValue({ id: mockSocketId } as any);
        lobbyServiceSpy.getSocket.and.returnValue({ id: mockSocketId } as any);
        playerStateServiceSpy.getLobbyData.and.returnValue({
            code: mockLobbyCode,
            locked: false,
            maxPlayers: 0,
            players: [],
            mapId: '',
        });

        TestBed.configureTestingModule({
            providers: [
                ChatService,
                { provide: GameStateService, useValue: gameStateServiceSpy },
                { provide: LobbyService, useValue: lobbyServiceSpy },
                { provide: PlayerStateService, useValue: playerStateServiceSpy },
            ],
        });

        service = TestBed.inject(ChatService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('cleanUp', () => {
        it('should reset to lobby mode and clean up listeners', () => {
            service.resetToLobbyMode();
            verifyCleanupWasCalled();
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, jasmine.any(Function));
        });

        it('should clean up listeners when entering game mode', () => {
            service.enterAGame();
            expect(lobbyServiceSpy.off).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage);
            expect(lobbyServiceSpy.off).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory);

            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, jasmine.any(Function));
            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, jasmine.any(Function));
            expect(gameStateServiceSpy.firstPlayerTurn).toHaveBeenCalled();
        });
    });

    it('should send chat message in lobby mode', () => {
        const testMessage = 'Hello, world!';

        service.sendChatMessage(testMessage);

        expect(lobbyServiceSpy.sendMessage).toHaveBeenCalledWith(
            jasmine.objectContaining({
                content: testMessage,
                senderId: mockSocketId,
            }),
        );
    });

    it('should send chat message in game mode', () => {
        const testMessage = 'Hello, world!';

        service.enterAGame();
        service.sendChatMessage(testMessage);

        expect(gameStateServiceSpy.sendMessage).toHaveBeenCalledWith(
            jasmine.objectContaining({
                content: testMessage,
                senderId: mockSocketId,
            }),
        );
    });

    it('should request lobby chat history', () => {
        service.requestLobbyChatHistory();
        expect(lobbyServiceSpy.sendChatHistoryRequest).toHaveBeenCalledWith(mockLobbyCode);
    });

    it('should initialize with correct player name', () => {
        let currentName: string | undefined;
        service.currentPlayerName$.subscribe((name) => {
            currentName = name;
        });
        expect(currentName).toBe(mockPlayerInfo.name);
    });

    it('should get current player ID', () => {
        const playerId = service.getCurrentPlayerId();
        expect(playerId).toBe(mockSocketId);
    });

    it('should call setupLobbyListeners when resetting to lobby mode', () => {
        const setupSpy = spyOn<any>(service, 'setupLobbyListeners');
        const cleanupSpy = spyOn<any>(service, 'cleanupListeners');
        service.resetToLobbyMode();
        expect(cleanupSpy).toHaveBeenCalled();
        expect(setupSpy).toHaveBeenCalled();
    });

    describe('Private method testing', () => {
        it('should set up lobby listeners correctly', () => {
            lobbyServiceSpy.on.calls.reset();
            TestBed.resetTestingModule();
            TestBed.configureTestingModule({
                providers: [
                    ChatService,
                    { provide: GameStateService, useValue: gameStateServiceSpy },
                    { provide: LobbyService, useValue: lobbyServiceSpy },
                    { provide: PlayerStateService, useValue: playerStateServiceSpy },
                ],
            });
            service = TestBed.inject(ChatService);
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, jasmine.any(Function));
        });

        it('should properly transform messages from current user', () => {
            service = TestBed.inject(ChatService);
            const testMessage = {
                timeStamp: new Date().toISOString(),
                senderName: 'TestPlayer',
                senderId: mockSocketId,
                content: 'My message',
            };
            const capturedMessages: ChatMessage[] = [];
            service.messages$.subscribe((msg) => capturedMessages.push(msg));
            (service as any).handleMessage(testMessage, mockSocketId);
            expect(capturedMessages.length).toBe(1);
            expect(capturedMessages[0].senderName).toBe('Vous');
            expect(capturedMessages[0].content).toBe('My message');
        });

        it('should properly handle messages from other users', () => {
            service = TestBed.inject(ChatService);

            const testMessage = {
                timeStamp: new Date().toISOString(),
                senderName: 'OtherPlayer',
                senderId: 'other-123',
                content: 'Their message',
            };

            const capturedMessages: ChatMessage[] = [];
            service.messages$.subscribe((msg) => capturedMessages.push(msg));

            (service as any).handleMessage(testMessage, mockSocketId);

            expect(capturedMessages.length).toBe(1);
            expect(capturedMessages[0].senderName).toBe('OtherPlayer');
            expect(capturedMessages[0].content).toBe('Their message');
        });

        it('should create journal messages with correct format', () => {
            service = TestBed.inject(ChatService);

            const journalData = {
                message: 'Combat started',
                involvedPlayers: [mockSocketId, 'other-id'],
            };

            const journalEntries: JournalMessage[] = [];
            service.journalMessages$.subscribe((entry) => journalEntries.push(entry));

            (service as any).nextMessage(journalData);

            expect(journalEntries.length).toBe(1);
            expect(journalEntries[0].content).toBe('Combat started');
            expect(journalEntries[0].involvedPlayers).toEqual([mockSocketId, 'other-id']);
            expect(journalEntries[0].timeStamp).toBeDefined();
        });

        it('should correctly set up game listeners', () => {
            gameStateServiceSpy.on.calls.reset();

            service = TestBed.inject(ChatService);

            service.enterAGame();

            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, jasmine.any(Function));
            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, jasmine.any(Function));

            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(ActionJournalEvents.TurnJournalTransition, jasmine.any(Function));
            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(ActionJournalEvents.CombatJournal, jasmine.any(Function));
            expect(gameStateServiceSpy.on).toHaveBeenCalledWith(ActionJournalEvents.CombatJournalEnded, jasmine.any(Function));

            expect(gameStateServiceSpy.firstPlayerTurn).toHaveBeenCalled();
        });

        it('should process journal events correctly', () => {
            service = TestBed.inject(ChatService);
            service.enterAGame();

            const journalEntries: JournalMessage[] = [];
            service.journalMessages$.subscribe((entry) => journalEntries.push(entry));

            const onCalls = gameStateServiceSpy.on.calls.allArgs();
            const combatJournalHandler = onCalls.find((call) => call[0] === ActionJournalEvents.CombatJournal)?.[1];
            if (!combatJournalHandler) {
                throw new Error('CombatJournal handler not found');
            }

            const journalData = {
                message: 'Player attacked monster',
                involvedPlayers: [mockSocketId, 'monster-id'],
            };

            combatJournalHandler(journalData);

            expect(journalEntries.length).toBe(1);
            expect(journalEntries[0].content).toBe('Player attacked monster');
            expect(journalEntries[0].involvedPlayers).toEqual([mockSocketId, 'monster-id']);
        });
    });

    it('should fallback to empty senderId if socket id is undefined', () => {
        lobbyServiceSpy.getSocket.and.returnValue({ id: undefined } as any);
        const testMessage = 'Message with undefined socket';

        service.sendChatMessage(testMessage);

        expect(lobbyServiceSpy.sendMessage).toHaveBeenCalledWith(jasmine.objectContaining({ senderId: '' }));
    });

    it('should use given playerName if no playerInfo is emitted', () => {
        const tempService = new ChatService(gameStateServiceSpy, lobbyServiceSpy, {
            playerInfo$: new BehaviorSubject(null),
        } as any);

        let currentName = '';
        tempService.currentPlayerName$.subscribe((name) => (currentName = name));

        tempService.initializeCurrentPlayerName('FallbackName');
        expect(currentName).toBe('FallbackName');
    });

    it('should register RoomMessage listener and handle message correctly in lobby', () => {
        const mockMessage: ChatMessage = {
            timeStamp: '10:00:00',
            senderName: 'Alice',
            senderId: 'socket-abc',
            content: 'Hello from lobby!',
        };

        const handleMessageSpy = spyOn<any>(service, 'handleMessage');

        (service as any).setupLobbyListeners();

        const callback = lobbyServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.RoomMessage)?.args[1];

        expect(callback).toBeDefined();

        if (callback) {
            callback(mockMessage);
            expect(handleMessageSpy).toHaveBeenCalledWith(mockMessage, mockSocketId);
        }
    });

    it('should handle game RoomMessage by calling handleMessage', () => {
        const mockMessage: ChatMessage = {
            timeStamp: '11:00:00',
            senderName: 'Bob',
            senderId: 'socket-game',
            content: 'Hello from game!',
        };

        const handleMessageSpy = spyOn<any>(service, 'handleMessage');

        service.enterAGame();

        const roomMessageHandler = gameStateServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.RoomMessage)?.args[1];

        expect(roomMessageHandler).toBeDefined();

        if (roomMessageHandler) {
            roomMessageHandler(mockMessage);
            expect(handleMessageSpy).toHaveBeenCalledWith(mockMessage, mockSocketId);
        }
    });
    it('should handle game ChatHistory by calling handleMessage for each message', () => {
        const messages: ChatMessage[] = [
            { timeStamp: '11:01', senderName: 'Bob', senderId: 'id1', content: 'msg1' },
            { timeStamp: '11:02', senderName: 'Alice', senderId: 'id2', content: 'msg2' },
        ];

        const handleMessageSpy = spyOn<any>(service, 'handleMessage');

        service.enterAGame();
        const chatHistoryHandler = gameStateServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.ChatHistory)?.args[1];

        expect(chatHistoryHandler).toBeDefined();

        if (chatHistoryHandler) {
            chatHistoryHandler(messages);
            expect(handleMessageSpy).toHaveBeenCalledTimes(messages.length);
            expect(handleMessageSpy).toHaveBeenCalledWith(messages[0], mockSocketId);
            expect(handleMessageSpy).toHaveBeenCalledWith(messages[1], mockSocketId);
        }
    });

    it('should process multiple messages from chat history', () => {
        const messages = [
            { timeStamp: '00:01', senderName: 'UserA', senderId: 'id1', content: 'msg1' },
            { timeStamp: '00:02', senderName: 'UserB', senderId: 'id2', content: 'msg2' },
        ];
        const captured: ChatMessage[] = [];
        service.messages$.subscribe((msg) => captured.push(msg));

        const chatHistoryHandler = lobbyServiceSpy.on.calls.allArgs().find((args) => args[0] === CommonGatewayEvents.ChatHistory)?.[1];

        expect(chatHistoryHandler).toBeTruthy();
        if (chatHistoryHandler) {
            chatHistoryHandler(messages);
        }

        expect(captured.length).toBe(2);
        expect(captured[0].content).toBe('msg1');
    });

    const allJournalEvents = [
        ActionJournalEvents.TurnJournalTransition,
        ActionJournalEvents.CombatJournal,
        ActionJournalEvents.CombatJournalEnded,
        ActionJournalEvents.ToggleDebugJournal,
        ActionJournalEvents.LeaveGameJournal,
        ActionJournalEvents.DoorToggleJournal,
        ActionJournalEvents.CombatEscapeAttemptJournal,
        ActionJournalEvents.CombatEscapeAttemptJournalFailed,
        ActionJournalEvents.AttackJournalResult,
        ActionJournalEvents.ItemPickedUp,
    ];

    it('should call nextMessage for all journal events', () => {
        const mockData = {
            message: 'Test journal event',
            involvedPlayers: ['player-1', 'player-2'],
        };

        const nextMessageSpy = spyOn<any>(service, 'nextMessage');
        service.enterAGame();

        const registeredEvents = gameStateServiceSpy.on.calls.all();

        let handlersCalled = 0;
        for (const eventName of allJournalEvents) {
            const handler = registeredEvents.find((call) => call.args[0] === eventName)?.args[1];
            expect(handler).toBeDefined();

            if (handler) {
                handler(mockData);
                expect(nextMessageSpy).toHaveBeenCalledWith(mockData);
                handlersCalled++;
            }
        }
        expect(handlersCalled).toBe(allJournalEvents.length);
        expect(nextMessageSpy).toHaveBeenCalledTimes(allJournalEvents.length);
    });

    describe('Edge cases', () => {
        it('should use empty senderId when in game but socket id is undefined', () => {
            service.enterAGame();

            gameStateServiceSpy.getSocket.and.returnValue({ id: undefined } as any);

            const testMessage = 'Message in game with undefined socket id';
            service.sendChatMessage(testMessage);

            expect(gameStateServiceSpy.sendMessage).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    content: testMessage,
                    senderId: '',
                }),
            );
        });

        it('should use empty senderId when in game but socket id is null', () => {
            service.enterAGame();
            gameStateServiceSpy.getSocket.and.returnValue({ id: null } as any);

            const testMessage = 'Message in game with null socket id';
            service.sendChatMessage(testMessage);

            expect(gameStateServiceSpy.sendMessage).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    content: testMessage,
                    senderId: '',
                }),
            );
        });

        it('should use empty senderId when in game but socket id is empty string', () => {
            service.enterAGame();
            gameStateServiceSpy.getSocket.and.returnValue({ id: '' } as any);

            const testMessage = 'Message in game with empty socket id';
            service.sendChatMessage(testMessage);

            expect(gameStateServiceSpy.sendMessage).toHaveBeenCalledWith(
                jasmine.objectContaining({
                    content: testMessage,
                    senderId: '',
                }),
            );
        });

        it('should return empty string when currentPlayerId is falsy and socket.id is also falsy', () => {
            const tempService = new ChatService(gameStateServiceSpy, lobbyServiceSpy, playerStateServiceSpy);

            (tempService as any).currentPlayerId = '';

            gameStateServiceSpy.getSocket.and.returnValue({ id: undefined } as any);

            const playerId = tempService.getCurrentPlayerId();

            expect(playerId).toBe('');

            expect(gameStateServiceSpy.getSocket).toHaveBeenCalled();
        });

        it('should return empty string when currentPlayerId is falsy and socket.id is null', () => {
            const tempService = new ChatService(gameStateServiceSpy, lobbyServiceSpy, playerStateServiceSpy);
            (tempService as any).currentPlayerId = '';
            gameStateServiceSpy.getSocket.and.returnValue({ id: null } as any);

            const playerId = tempService.getCurrentPlayerId();
            expect(playerId).toBe('');
        });

        it('should return empty string when currentPlayerId is falsy and socket.id is empty string', () => {
            const tempService = new ChatService(gameStateServiceSpy, lobbyServiceSpy, playerStateServiceSpy);
            (tempService as any).currentPlayerId = '';
            gameStateServiceSpy.getSocket.and.returnValue({ id: '' } as any);

            const playerId = tempService.getCurrentPlayerId();
            expect(playerId).toBe('');
        });

        it('should return existing currentPlayerId without checking socket if already set', () => {
            const tempService = new ChatService(gameStateServiceSpy, lobbyServiceSpy, playerStateServiceSpy);

            (tempService as any).currentPlayerId = 'existing-id';

            gameStateServiceSpy.getSocket.calls.reset();

            const playerId = tempService.getCurrentPlayerId();

            expect(playerId).toBe('existing-id');

            expect(gameStateServiceSpy.getSocket).not.toHaveBeenCalled();
        });

        it('should handle falsy socket ID in lobby RoomMessage listener', () => {
            const mockMessage: ChatMessage = {
                timeStamp: '10:00:00',
                senderName: 'Alice',
                senderId: 'socket-abc',
                content: 'Hello from lobby!',
            };

            const handleMessageSpy = spyOn<any>(service, 'handleMessage');

            lobbyServiceSpy.getSocket.and.returnValue({ id: undefined } as any);

            (service as any).setupLobbyListeners();
            const callback = lobbyServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.RoomMessage)?.args[1];

            expect(callback).toBeDefined();
            if (callback) {
                callback(mockMessage);
                expect(handleMessageSpy).toHaveBeenCalledWith(mockMessage, '');
            }
        });

        it('should handle falsy socket ID in lobby ChatHistory listener', () => {
            const messages: ChatMessage[] = [
                { timeStamp: '11:01', senderName: 'Bob', senderId: 'id1', content: 'msg1' },
                { timeStamp: '11:02', senderName: 'Alice', senderId: 'id2', content: 'msg2' },
            ];

            const handleMessageSpy = spyOn<any>(service, 'handleMessage');

            lobbyServiceSpy.getSocket.and.returnValue({ id: null } as any);

            (service as any).setupLobbyListeners();

            const callback = lobbyServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.ChatHistory)?.args[1];

            expect(callback).toBeDefined();
            if (callback) {
                callback(messages);
                expect(handleMessageSpy).toHaveBeenCalledTimes(2);
                expect(handleMessageSpy).toHaveBeenCalledWith(messages[0], '');
                expect(handleMessageSpy).toHaveBeenCalledWith(messages[1], '');
            }
        });

        it('should handle falsy socket ID in game RoomMessage listener', () => {
            const mockMessage: ChatMessage = {
                timeStamp: '10:00:00',
                senderName: 'Alice',
                senderId: 'socket-abc',
                content: 'Hello from game!',
            };

            const handleMessageSpy = spyOn<any>(service, 'handleMessage');

            service.enterAGame();

            handleMessageSpy.calls.reset();

            gameStateServiceSpy.getSocket.and.returnValue({ id: '' } as any);

            const callback = gameStateServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.RoomMessage)?.args[1];

            expect(callback).toBeDefined();
            if (callback) {
                callback(mockMessage);
                expect(handleMessageSpy).toHaveBeenCalledWith(mockMessage, '');
            }
        });

        it('should handle falsy socket ID in game ChatHistory listener', () => {
            const messages: ChatMessage[] = [
                { timeStamp: '11:01', senderName: 'Bob', senderId: 'id1', content: 'msg1' },
                { timeStamp: '11:02', senderName: 'Alice', senderId: 'id2', content: 'msg2' },
            ];

            const handleMessageSpy = spyOn<any>(service, 'handleMessage');

            service.enterAGame();

            handleMessageSpy.calls.reset();

            gameStateServiceSpy.getSocket.and.returnValue({ id: '' } as any);

            const callback = gameStateServiceSpy.on.calls.all().find((call) => call.args[0] === CommonGatewayEvents.ChatHistory)?.args[1];

            expect(callback).toBeDefined();
            if (callback) {
                callback(messages);
                expect(handleMessageSpy).toHaveBeenCalledTimes(2);
                expect(handleMessageSpy).toHaveBeenCalledWith(messages[0], '');
                expect(handleMessageSpy).toHaveBeenCalledWith(messages[1], '');
            }
        });

        it('should handle missing lobbyData when setting up game listeners', () => {
            playerStateServiceSpy.getLobbyData.and.returnValue(null);

            expect(() => {
                service.enterAGame();
            }).not.toThrow();

            expect(gameStateServiceSpy.sendChatHistoryRequest).not.toHaveBeenCalled();
        });

        it('should handle lobbyData with missing code when setting up game listeners', () => {
            playerStateServiceSpy.getLobbyData.and.returnValue({
                locked: false,
                maxPlayers: 0,
                players: [],
                mapId: '',
                code: '',
            } as Lobby);

            expect(() => {
                service.enterAGame();
            }).not.toThrow();

            expect(gameStateServiceSpy.sendChatHistoryRequest).not.toHaveBeenCalled();
        });
    });
});
