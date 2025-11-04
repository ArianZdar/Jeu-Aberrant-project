/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { TestBed } from '@angular/core/testing';
import { LobbyService } from './lobby.service';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { LobbyGatewayEvents } from '@common/events/gateway-events';
import { Socket } from 'socket.io-client';

describe('LobbyService', () => {
    let service: LobbyService;
    let playerStateServiceSpy: jasmine.SpyObj<PlayerStateService>;
    let snackBarServiceSpy: jasmine.SpyObj<SnackBarService>;
    let socketSpy: jasmine.SpyObj<Socket>;

    beforeEach(() => {
        socketSpy = jasmine.createSpyObj('Socket', ['emit', 'on', 'off', 'disconnect', 'connect', 'once']);
        playerStateServiceSpy = jasmine.createSpyObj('PlayerStateService', ['setLobbyData', 'clearState']);
        snackBarServiceSpy = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);

        TestBed.configureTestingModule({
            providers: [
                LobbyService,
                { provide: PlayerStateService, useValue: playerStateServiceSpy },
                { provide: SnackBarService, useValue: snackBarServiceSpy },
            ],
        });
        service = TestBed.inject(LobbyService);
        Reflect.set(service, 'socket', socketSpy);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('ToggleLockLobby Management', () => {
        describe('toggleLockLobby', () => {
            beforeEach(() => {
                socketSpy.emit.calls.reset();
            });

            it('should emit ToggleLockLobby event when locking', () => {
                service.toggleLockLobby(true);
                expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ToggleLockLobby, true);
                expect(socketSpy.emit).toHaveBeenCalledTimes(1);
            });

            it('should emit ToggleLockLobby event when unlocking', () => {
                service.toggleLockLobby(false);
                expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ToggleLockLobby, false);
                expect(socketSpy.emit).toHaveBeenCalledTimes(1);
            });
        });
    });

    describe('Lobby Management', () => {
        beforeEach(() => {
            socketSpy.emit.calls.reset();
            socketSpy.once.calls.reset();
            playerStateServiceSpy.setLobbyData.calls.reset();
        });
        it('should handle successful join lobby', async () => {
            const mockResponse = {
                hasJoinedLobby: true,
                lobby: {
                    code: 'test-pin',
                    maxPlayers: 4,
                    locked: false,
                    players: [],
                    mapId: 'test-map',
                    selectedChampions: [],
                },
            };
            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.JoinLobby) {
                        callback(mockResponse);
                    }
                    return socketSpy;
                });
                return socketSpy;
            });
            const result = await service.joinLobby('test-pin');
            expect(result).toEqual(mockResponse);
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.JoinLobby, 'test-pin');
            expect(playerStateServiceSpy.setLobbyData).toHaveBeenCalledWith(mockResponse.lobby);
        });

        it('should handle join lobby failure', async () => {
            const mockResponse = {
                hasJoinedLobby: false,
            };

            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.ErrorLobby) {
                        callback(mockResponse);
                    }
                    return socketSpy;
                });
                return socketSpy;
            });

            const result = await service.joinLobby('invalid-pin');

            expect(result.hasJoinedLobby).toBeFalse();
            expect(playerStateServiceSpy.setLobbyData).not.toHaveBeenCalled();
        });

        it('should handle error during join lobby', async () => {
            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.ErrorLobby) {
                        callback({ hasJoinedLobby: false });
                    }
                    return socketSpy;
                });
                return socketSpy;
            });

            const result = await service.joinLobby('error-pin');

            expect(result.hasJoinedLobby).toBeFalse();
        });

        it('should leave lobby', () => {
            service.leaveLobby();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.LeaveLobby);
        });

        it('is lobby full', async () => {
            const playerInfo = {
                _id: 'test-id',
                name: 'test-player',
                championIndex: 0,
                healthPower: 100,
                attackPower: 10,
                defensePower: 5,
                speed: 7,
                isReady: false,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: false,
                isAggressive: false,
                isLeader: false,
            };

            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.IsLobbyFull) {
                        callback(true);
                    }
                    return socketSpy;
                });
                return socketSpy;
            });
            const result = await service.isLobbyFull(playerInfo);
            expect(result).toBeTrue();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyFull, playerInfo);
        });

        it('should check if lobby is locked', async () => {
            const playerInfo = {
                _id: 'test-id',
                name: 'test-player',
                championIndex: 0,
                healthPower: 100,
                attackPower: 10,
                defensePower: 5,
                speed: 7,
                isReady: false,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: false,
                isAggressive: false,
                isLeader: false,
            };

            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.IsLobbyLocked) {
                        callback(true);
                    }
                    return socketSpy;
                });
                return socketSpy;
            });

            const result = await service.isLobbyLocked(playerInfo);

            expect(result).toBeTrue();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyLocked, playerInfo);
        });

        it('should handle unlocked lobby check', async () => {
            const playerInfo = {
                _id: 'test-id',
                name: 'test-player',
                championIndex: 0,
                healthPower: 100,
                attackPower: 10,
                defensePower: 5,
                speed: 7,
                isReady: false,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: false,
                isAggressive: false,
                isLeader: false,
            };

            socketSpy.emit.and.callFake(() => {
                socketSpy.once.and.callFake((event, callback) => {
                    if (event === LobbyGatewayEvents.IsLobbyLocked) {
                        callback(false);
                    }
                    return socketSpy;
                });
                return socketSpy;
            });

            const result = await service.isLobbyLocked(playerInfo);

            expect(result).toBeFalse();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyLocked, playerInfo);
        });
    });

    describe('Room Management', () => {
        it('should create room', () => {
            const roomData = { mapId: 'test', maxPlayers: 4, isLocked: false };
            service.createRoom(roomData);
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.CreateRoom, roomData);
        });
    });

    describe('Game Management', () => {
        describe('startGame', () => {
            beforeEach(() => {
                socketSpy.emit.calls.reset();
                socketSpy.once.calls.reset();
            });

            it('should start game successfully', async () => {
                socketSpy.emit.and.returnValue(socketSpy);
                socketSpy.once.and.callFake((_event, callback) => {
                    callback({});
                    return socketSpy;
                });
                const startPromise = service.startGame();

                await expectAsync(startPromise).toBeResolved();
                expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.StartGame);
                expect(socketSpy.once).toHaveBeenCalledWith(LobbyGatewayEvents.StartGame, jasmine.any(Function));
            });

            it('should handle game start failure', async () => {
                socketSpy.emit.and.returnValue(socketSpy);
                socketSpy.once.and.returnValue(socketSpy);
                const startPromise = service.startGame();
                await expectAsync(startPromise).toBePending();
            });
        });
    });

    describe('Player selection', () => {
        it('should handle champion selection', () => {
            const index = 1;
            service.championSelected(index);
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, { index });
        });

        it('should get selected champions', () => {
            service.getSelectedChampions();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.GetSelectedChampions);
        });
    });

    describe('kickPlayer', () => {
        beforeEach(() => {
            socketSpy.emit.calls.reset();
            snackBarServiceSpy.showSnackBar.calls.reset();
        });

        it('should emit kick event with correct player name', () => {
            const playerName = 'testPlayer';
            service.kickPlayer(playerName);

            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.KickPlayer, 'testPlayer');
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should show snackbar message with correct player name', () => {
            const playerName = 'testPlayer';
            const expectedMessage = `Le joueur ${playerName} a été expulsé de la partie.`;

            service.kickPlayer(playerName);

            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith(expectedMessage);
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledTimes(1);
        });

        it('should handle undefined player name', () => {
            const playerName = undefined;
            Reflect.apply(service.kickPlayer, service, [playerName]);

            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.KickPlayer, undefined);
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Le joueur undefined a été expulsé de la partie.');
        });

        it('should handle champion selection with old index', () => {
            const newIndex = 2;
            const oldIndex = 1;
            service.championSelected(newIndex, oldIndex);
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, {
                index: newIndex,
                oldIndex,
            });
        });

        it('should handle champion deselection', () => {
            service.championDeselected();
            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionDeselected);
        });

        it('should maintain correct order of operations', () => {
            const playerName = 'testPlayer';
            service.kickPlayer(playerName);

            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledBefore(socketSpy.emit);
        });
    });

    describe('Socket management', () => {
        it('should get socket instance', () => {
            expect(service.getSocket()).toBe(socketSpy);
        });

        it('should get socket id when connected', () => {
            socketSpy.id = 'test-id';
            expect(service.getSocketId()).toBe('test-id');
        });

        it('should get empty string when socket is not connected', () => {
            socketSpy.id = undefined;
            expect(service.getSocketId()).toBe('');
        });

        it('should disconnect and clear state', () => {
            service.disconnect();
            expect(socketSpy.disconnect).toHaveBeenCalled();
            expect(playerStateServiceSpy.clearState).toHaveBeenCalled();
        });

        it('should check if socket is alive when connected', () => {
            socketSpy.connected = true;
            expect(service.isSocketAlive()).toBeTrue();
        });

        it('should check if socket is not alive when disconnected', () => {
            socketSpy.connected = false;
            expect(service.isSocketAlive()).toBeFalse();
        });

        describe('on', () => {
            it('should register event listener on the socket', () => {
                const eventName = 'test-event';
                const callback = jasmine.createSpy('callback');

                service.on(eventName, callback);

                expect(socketSpy.on).toHaveBeenCalledWith(eventName, callback);
            });
        });

        describe('off', () => {
            it('should call socket.off with the correct event', () => {
                const eventName = 'test-event';
                socketSpy.off.and.returnValue(socketSpy);

                service.off(eventName);

                expect(socketSpy.off).toHaveBeenCalledWith(eventName);
            });
        });
    });
    describe('Chat Functionality', () => {
        beforeEach(() => {
            socketSpy.emit.calls.reset();
        });

        it('should send chat history request with correct lobby ID', () => {
            const lobbyId = 'lobby-123';

            service.sendChatHistoryRequest(lobbyId);

            expect(socketSpy.emit).toHaveBeenCalledWith('chatHistory', lobbyId);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should handle empty lobby ID in chat history request', () => {
            const lobbyId = '';

            service.sendChatHistoryRequest(lobbyId);

            expect(socketSpy.emit).toHaveBeenCalledWith('chatHistory', '');
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should send message with correct chat message object', () => {
            const mockMessage = {
                senderName: 'TestUser',
                senderId: 'user-123',
                content: 'Hello world!',
                timeStamp: new Date().toISOString(),
            };
            service.sendMessage(mockMessage);

            expect(socketSpy.emit).toHaveBeenCalledWith('roomMessage', mockMessage);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should handle system message in sendMessage', () => {
            const mockSystemMessage = {
                senderName: 'System',
                senderId: 'system',
                content: 'Player has joined the game',
                timeStamp: new Date().toISOString(),
            };

            service.sendMessage(mockSystemMessage);

            expect(socketSpy.emit).toHaveBeenCalledWith('roomMessage', mockSystemMessage);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });
    });

    describe('Bot Management', () => {
        beforeEach(() => {
            socketSpy.emit.calls.reset();
        });

        it('should add aggressive bot properly', () => {
            service.addBot(true);

            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.AddBot, true);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should add defensive bot properly', () => {
            service.addBot(false);

            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.AddBot, false);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });

        it('should handle undefined behavior parameter', () => {
            Reflect.apply(service.addBot, service, [undefined]);

            expect(socketSpy.emit).toHaveBeenCalledWith(LobbyGatewayEvents.AddBot, undefined);
            expect(socketSpy.emit).toHaveBeenCalledTimes(1);
        });
    });
});
