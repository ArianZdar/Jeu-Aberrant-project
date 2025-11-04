import { TestBed } from '@angular/core/testing';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { PlayerStateService } from './player-state.service';

describe('PlayerStateService', () => {
    let service: PlayerStateService;
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

    const mockLobby: Lobby = {
        locked: false,
        maxPlayers: 10,
        code: 'ABC123',
        players: [mockPlayerInfo],
        mapId: 'map1',
    };

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PlayerStateService],
        });
        service = TestBed.inject(PlayerStateService);
    });

    describe('Initialisation', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should initialize with null player info', () => {
            let playerInfo: PlayerInfo | null = {} as PlayerInfo;
            (service as PlayerStateService & { playerInfo$: import('rxjs').Observable<PlayerInfo | null> }).playerInfo$.subscribe(
                (info: PlayerInfo | null) => {
                    playerInfo = info;
                },
            );
            expect(playerInfo).toBeNull();
        });

        it('should initialize with null lobby data', () => {
            let lobbyData: Lobby | null = {} as Lobby;
            service.lobbyData$.subscribe((lobby) => {
                lobbyData = lobby;
            });
            expect(lobbyData).toBeNull();
        });

        it('should initialize with empty connected users array', () => {
            let users: string[] = ['placeholder'];
            (service as PlayerStateService & { connectedUsers$: unknown }).connectedUsers$.subscribe((connectedUsers: string[]) => {
                users = connectedUsers;
            });
            expect(users).toEqual([]);
        });
    });

    describe('setPlayerInfo()', () => {
        it('should update playerInfoSource', () => {
            let result: PlayerInfo | null = null;
            (service as PlayerStateService & { playerInfo$: unknown }).playerInfo$.subscribe((info: PlayerInfo | null) => {
                result = info;
            });

            service.setPlayerInfo(mockPlayerInfo);

            expect(result).not.toBeNull();
            expect(result).toEqual(jasmine.objectContaining(mockPlayerInfo));
        });
    });

    describe('setLobbyData()', () => {
        it('should update lobbyDataSource', () => {
            let result: Lobby | null = null;
            service.lobbyData$.subscribe((lobby) => {
                result = lobby;
            });

            service.setLobbyData(mockLobby);

            expect(result).not.toBeNull();
            expect(result).toEqual(jasmine.objectContaining(mockLobby));
        });
    });

    describe('getLobbyData()', () => {
        it('should return current lobby data value', () => {
            service.setLobbyData(mockLobby);
            const result = service.getLobbyData();

            expect(result).toEqual(mockLobby);
        });

        it('should return null if no lobby data is set', () => {
            service.clearState();
            const result = service.getLobbyData();

            expect(result).toBeNull();
        });
    });

    describe('addConnectedUser()', () => {
        it('should add user to connectedUsers list', () => {
            let users: string[] = [];
            (service as PlayerStateService & { connectedUsers$: import('rxjs').Observable<string[]> }).connectedUsers$.subscribe(
                (connectedUsers: string[]) => {
                    users = connectedUsers;
                },
            );

            service.addConnectedUser('user1');

            expect(users).toEqual(['user1']);
        });

        it('should not add duplicate users', () => {
            service.addConnectedUser('user1');
            service.addConnectedUser('user2');
            service.addConnectedUser('user1');

            let users: string[] = [];
            (service as PlayerStateService & { connectedUsers$: import('rxjs').Observable<string[]> }).connectedUsers$.subscribe(
                (connectedUsers: string[]) => {
                    users = connectedUsers;
                },
            );

            expect(users).toEqual(['user1', 'user2']);
        });
    });

    describe('clearState()', () => {
        it('should reset playerInfo and lobbyData to null', () => {
            service.setPlayerInfo(mockPlayerInfo);
            service.setLobbyData(mockLobby);

            service.clearState();

            let playerInfo: PlayerInfo | null = {} as PlayerInfo;
            let lobbyData: Lobby | null = {} as Lobby;

            (service as PlayerStateService & { playerInfo$: import('rxjs').Observable<PlayerInfo | null> }).playerInfo$.subscribe(
                (info: PlayerInfo | null) => {
                    playerInfo = info;
                },
            );
            service.lobbyData$.subscribe((lobby) => {
                lobbyData = lobby;
            });

            expect(playerInfo).toBeNull();
            expect(lobbyData).toBeNull();
        });

        it('should not clear connectedUsers', () => {
            service.addConnectedUser('user1');
            service.clearState();

            let users: string[] = [];
            (service as PlayerStateService & { connectedUsers$: import('rxjs').Observable<string[]> }).connectedUsers$.subscribe(
                (connectedUsers: string[]) => {
                    users = connectedUsers;
                },
            );

            expect(users).toEqual(['user1']);
        });
    });
});
