import { TestBed } from '@angular/core/testing';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { Socket } from 'socket.io-client';
import { ChampSelectService } from './champ-select.service';
import { ChampSelectEvents } from '@app/constants/client-constants';

const mockPlayerInfo: PlayerInfo = {
    _id: '123',
    name: 'TestPlayer',
    championIndex: 0,
    healthPower: 100,
    attackPower: 10,
    defensePower: 5,
    speed: 3,
    isReady: false,
    isAlive: true,
    isWinner: false,
    isDisconnected: false,
    isBot: false,
    isAggressive: false,
    isLeader: false,
};

const mockPlayerList: PlayerInfo[] = [
    { ...mockPlayerInfo },
    {
        ...mockPlayerInfo,
        _id: '456',
        name: 'Player2',
    },
];

const mockLobby: Lobby = {
    locked: false,
    maxPlayers: 10,
    code: '123',
    players: mockPlayerList,
    mapId: 'map1',
};

describe('ChampSelectService', () => {
    let service: ChampSelectService;
    let lobbyServiceMock: jasmine.SpyObj<LobbyService>;
    let playerStateServiceMock: jasmine.SpyObj<PlayerStateService>;
    let socketMock: jasmine.SpyObj<Socket>;

    beforeEach(() => {
        socketMock = jasmine.createSpyObj('Socket', ['on', 'emit']);

        lobbyServiceMock = jasmine.createSpyObj('LobbyService', ['getSocket', 'isLobbyFull', 'isLobbyLocked']);
        lobbyServiceMock.getSocket.and.returnValue(socketMock);

        playerStateServiceMock = jasmine.createSpyObj('PlayerStateService', ['setPlayerInfo', 'setLobbyData']);

        TestBed.configureTestingModule({
            providers: [
                ChampSelectService,
                { provide: LobbyService, useValue: lobbyServiceMock },
                { provide: PlayerStateService, useValue: playerStateServiceMock },
            ],
        });

        service = TestBed.inject(ChampSelectService);
    });

    describe('Initialisation', () => {
        it('should create the service', () => {
            expect(service).toBeTruthy();
        });

        it('should register event listeners on socket in constructor', () => {
            expect(socketMock.on).toHaveBeenCalledWith(ChampSelectEvents.ChampSelectSubmitted, jasmine.any(Function));
            expect(socketMock.on).toHaveBeenCalledWith(ChampSelectEvents.ChampSelectError, jasmine.any(Function));
        });
    });

    describe('submitChampSelect()', () => {
        it('should update player info and emit event to server', () => {
            service.submitChampSelect(mockPlayerInfo);

            expect(playerStateServiceMock.setPlayerInfo).toHaveBeenCalledWith(mockPlayerInfo);
            expect(socketMock.emit).toHaveBeenCalledWith(ChampSelectEvents.SubmitChampSelect, mockPlayerInfo);
        });
    });

    describe('isRoomFull()', () => {
        it('should call isLobbyFull from lobbyService', async () => {
            lobbyServiceMock.isLobbyFull.and.resolveTo(true);

            const result = await service.isRoomFull(mockPlayerInfo);

            expect(lobbyServiceMock.isLobbyFull).toHaveBeenCalledWith(mockPlayerInfo);
            expect(result).toBe(true);
        });
    });

    describe('isRoomLocked()', () => {
        it('should call isLobbyLocked from lobbyService', async () => {
            lobbyServiceMock.isLobbyLocked.and.resolveTo(false);

            const result = await service.isRoomLocked(mockPlayerInfo);

            expect(lobbyServiceMock.isLobbyLocked).toHaveBeenCalledWith(mockPlayerInfo);
            expect(result).toBe(false);
        });
    });

    describe('handleSocketEvents', () => {
        describe('ChampSelectSubmitted event', () => {
            it('should emit champSelectSubmitted event when receiving event with PlayerInfo', () => {
                spyOn(service.champSelectSubmitted, 'emit');

                const onCallArgs = socketMock.on.calls.argsFor(0);
                const eventName = onCallArgs[0];
                const callback = onCallArgs[1];

                expect(eventName).toBe(ChampSelectEvents.ChampSelectSubmitted);
                callback(mockPlayerInfo);

                expect(service.champSelectSubmitted.emit).toHaveBeenCalledWith(mockPlayerInfo);
            });

            it('should update lobby data when receiving event with Lobby', () => {
                const onCallArgs = socketMock.on.calls.argsFor(1);
                const callback = onCallArgs[1];

                callback(mockLobby);

                expect(playerStateServiceMock.setLobbyData).toHaveBeenCalledWith(mockLobby);
            });
        });

        describe('ChampSelectError event', () => {
            it('should emit champSelectError event when receiving error', () => {
                const errorMessage = { message: 'Test error' };
                spyOn(service.champSelectError, 'emit');

                let errorHandler: ((error: { message: string }) => void) | undefined;
                for (let i = 0; i < socketMock.on.calls.count(); i++) {
                    const args = socketMock.on.calls.argsFor(i);
                    if (args[0] === ChampSelectEvents.ChampSelectError) {
                        errorHandler = args[1];
                        break;
                    }
                }

                expect(errorHandler).toBeDefined();
                if (errorHandler) {
                    errorHandler(errorMessage);
                    expect(service.champSelectError.emit).toHaveBeenCalledWith(errorMessage);
                }
            });
        });
    });
});
