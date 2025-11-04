/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, RouterLink, provideRouter } from '@angular/router';
import { LobbyCodeComponent } from '@app/components/lobby-page-components/lobby-code/lobby-code.component';
import { LobbyGridComponent } from '@app/components/lobby-page-components/lobby-grid/lobby-grid.component';
import { PlayerBannerListComponent } from '@app/components/lobby-page-components/player-banner-list/player-banner-list.component';
import { createMockPlayer, getFakeGameInfo, mockFullLobbyWithCorrectLeader, mockLobby } from '@app/constants/mocks';
import { GameService } from '@app/services/game/game.service';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { GameInfo, MIN_PLAYERS } from '@common/game/game-info';
import { LobbyGatewayEvents } from '@common/events/gateway-events';
import { Lobby } from '@common/lobby/lobby-info';
import { of } from 'rxjs';
import { LobbyPageComponent } from './lobby-page.component';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { ChatService } from '@app/services/chat/chat.service';
import { GameModes } from '@common/game/game-enums';

describe('LobbyPageComponent', () => {
    let component: LobbyPageComponent;
    let fixture: ComponentFixture<LobbyPageComponent>;
    let gameServiceSpy: jasmine.SpyObj<GameService>;
    let routerSpy: jasmine.SpyObj<Router>;
    let lobbyServiceSpy: jasmine.SpyObj<LobbyService>;
    let snackBarServiceSpy: jasmine.SpyObj<SnackBarService>;
    let playerStateServiceSpy: jasmine.SpyObj<PlayerStateService>;
    let changeDetectorRefSpy: jasmine.SpyObj<ChangeDetectorRef>;
    let gameStateServiceSpy: jasmine.SpyObj<GameStateService>;
    let chatServiceSpy: jasmine.SpyObj<ChatService>;

    const mockGame: GameInfo = getFakeGameInfo();

    const fullMockLobby: Lobby = {
        ...mockLobby,
        players: [createMockPlayer(true), createMockPlayer(false), createMockPlayer(false), createMockPlayer(false)],
        maxPlayers: 4,
    };

    const getCallbackForEvent = (eventName: string): ((args: unknown) => void) => {
        for (let i = 0; i < lobbyServiceSpy.on.calls.count(); i++) {
            const args = lobbyServiceSpy.on.calls.argsFor(i);
            if (args[0] === eventName) {
                return args[1];
            }
        }
        throw new Error(`No callback found for event: ${eventName}`);
    };

    beforeEach(async () => {
        chatServiceSpy = jasmine.createSpyObj('ChatService', ['resetToLobbyMode', 'enterAGame', 'requestLobbyChatHistory'], {
            messages$: of([]),
            journalMessages$: of([]),
            currentPlayerName$: of('TestPlayer'),
        });

        gameServiceSpy = jasmine.createSpyObj('GameService', ['getGameById']);
        gameServiceSpy.getGameById.and.returnValue(of(mockGame));

        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        lobbyServiceSpy = jasmine.createSpyObj('LobbyService', [
            'isSocketAlive',
            'on',
            'off',
            'leaveLobby',
            'toggleLockLobby',
            'startGame',
            'getSocketId',
            'championDeselected',
        ]);
        lobbyServiceSpy.isSocketAlive.and.returnValue(true);
        lobbyServiceSpy.getSocketId.and.returnValue('player1');
        lobbyServiceSpy.toggleLockLobby.and.returnValue(undefined);

        snackBarServiceSpy = jasmine.createSpyObj('SnackBarService', ['showSnackBar', 'showSnackBarPositive']);
        changeDetectorRefSpy = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
        playerStateServiceSpy = jasmine.createSpyObj('PlayerStateService', ['getLobbyData'], {
            lobbyData$: of(mockLobby),
        });
        gameStateServiceSpy = jasmine.createSpyObj<GameStateService>('GameStateService', ['createGame']);

        await TestBed.configureTestingModule({
            imports: [CommonModule, RouterLink, PlayerBannerListComponent, LobbyGridComponent, LobbyCodeComponent, LobbyPageComponent],
            providers: [
                provideRouter([]),
                { provide: GameService, useValue: gameServiceSpy },
                { provide: Router, useValue: routerSpy },
                { provide: LobbyService, useValue: lobbyServiceSpy },
                { provide: SnackBarService, useValue: snackBarServiceSpy },
                { provide: PlayerStateService, useValue: playerStateServiceSpy },
                { provide: ChangeDetectorRef, useValue: changeDetectorRefSpy },
                { provide: GameStateService, useValue: gameStateServiceSpy },
                { provide: ChatService, useValue: chatServiceSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LobbyPageComponent);
        component = fixture.componentInstance;
    });

    describe('Cleanup', () => {
        it('should unsubscribe from subscriptions on destroy', () => {
            const subscriptionSpy = spyOn(component['subscription'], 'unsubscribe');
            component.ngOnDestroy();
            expect(subscriptionSpy).toHaveBeenCalled();
        });
    });

    describe('Initialisation', () => {
        it('should create the component', () => {
            expect(component).toBeTruthy();
        });

        it('should navigate to home if the socket is not alive', () => {
            lobbyServiceSpy.isSocketAlive.and.returnValue(false);
            component.ngOnInit();

            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should navigate back to champion selection', () => {
            component.goBackToChampionSelection();
            expect(lobbyServiceSpy.championDeselected).toHaveBeenCalled();
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/champ-select']);
        });

        it('should subscribe to lobbyData$ and handle lobby data', async () => {
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;
            await component.ngOnInit();
            expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
        });

        it('should set up socket event listeners', async () => {
            await component.ngOnInit();
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.ChampSelectSubmitted, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.PlayerJoined, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.PlayerLeft, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.LeaderLeft, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.KickPlayer, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.Kicked, jasmine.any(Function));
            expect(lobbyServiceSpy.on).toHaveBeenCalledWith(LobbyGatewayEvents.StartGame, jasmine.any(Function));
        });
    });
    describe('toggleLockRoom', () => {
        it('should not toggle lock if lobby is locked and full', () => {
            (component as any).currentLobby = { ...fullMockLobby, locked: true };
            component.playerInfo = fullMockLobby.players;
            component.maxPlayers = fullMockLobby.maxPlayers;
            component.toggleLockRoom();
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Impossible de déverrouiller un lobby complet.');
            expect(lobbyServiceSpy.toggleLockLobby).not.toHaveBeenCalled();
        });
        it('should toggle lock if lobby is not full or not locked', () => {
            (component as any).currentLobby = { ...mockLobby, locked: false };
            component.toggleLockRoom();

            expect((component as any).isLocked).toBeTrue();
            expect((component as any).currentLobby.locked).toBeTrue();
            expect(lobbyServiceSpy.toggleLockLobby).toHaveBeenCalledWith(true);
        });
    });
    describe('lockRoom', () => {
        it('should lock the room', () => {
            (component as any).currentLobby = { ...mockLobby };
            component.lockRoom();
            expect(component.isLocked).toBeTrue();
            expect((component as any).currentLobby.locked).toBeTrue();
            expect(lobbyServiceSpy.toggleLockLobby).toHaveBeenCalledWith(true);
        });
    });
    describe('startGame', () => {
        it('should not start game if lobby is not locked', () => {
            (component as any).currentLobby = { ...mockLobby, locked: false };
            component.startGame();
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Le lobby doit être verrouillé pour démarrer le jeu.');
            expect(lobbyServiceSpy.startGame).not.toHaveBeenCalled();
        });
        it('should not start game if lobby has fewer than minimum players', () => {
            const lobbyWithOnePlayer = {
                ...mockLobby,
                locked: true,
                players: [createMockPlayer(true)],
            };

            (component as any).currentLobby = lobbyWithOnePlayer;
            component.playerInfo = lobbyWithOnePlayer.players;
            component.maxPlayers = lobbyWithOnePlayer.maxPlayers;
            expect(component.playerInfo.length).toBeLessThan(MIN_PLAYERS);
            component.startGame();
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith(
                'Le lobby doit avoir au moins ' + MIN_PLAYERS + ' joueurs pour démarrer le jeu.',
            );
            expect(lobbyServiceSpy.startGame).not.toHaveBeenCalled();
        });
        it('should handle StartGame event and navigate to game page', async () => {
            component.roomCode = 'TEST123';
            await component.ngOnInit();
            const callback = getCallbackForEvent(LobbyGatewayEvents.StartGame);
            callback(null);
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/game', component.roomCode]);
        });
        it('should call createGame and startGame when lobby is locked and has enough players', async () => {
            (component as any).currentLobby = { ...fullMockLobby, locked: true };
            component.playerInfo = fullMockLobby.players;
            component.maxPlayers = fullMockLobby.maxPlayers;
            component.isVisionLeader = true;
            component.roomCode = 'TEST123';
            (component as any).mapId = 'map123';

            const createGameSpy = spyOn(component as unknown as { createGame: () => Promise<string> }, 'createGame').and.returnValue(
                Promise.resolve('game-id'),
            );
            await component.startGame();
            expect(createGameSpy).toHaveBeenCalled();
            expect(lobbyServiceSpy.startGame).toHaveBeenCalled();
        });
    });
    describe('Socket Event Handlers', () => {
        it('should handle ChampSelectSubmitted event', async () => {
            await component.ngOnInit();
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;
            const callback = getCallbackForEvent(LobbyGatewayEvents.ChampSelectSubmitted);
            callback(mockLobby);
            expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
        });
        it('should unlock lobby when player leaves a full locked lobby and current player is leader', async () => {
            await component.ngOnInit();
            const FULL_LOBBY_SIZE = 4;
            const PLAYERS_AFTER_LEAVING = FULL_LOBBY_SIZE - 1;
            const ONE_PLAYER_LEFT = 1;
            const fullLobbyMock = {
                ...fullMockLobby,
                locked: true,
            };
            const lobbyAfterPlayerLeft = {
                ...fullLobbyMock,
                players: fullMockLobby.players.slice(0, PLAYERS_AFTER_LEAVING),
            };

            (component as any).currentLobby = fullLobbyMock;
            component.maxPlayers = fullLobbyMock.maxPlayers;
            component.isVisionLeader = true;
            const callback = getCallbackForEvent(LobbyGatewayEvents.PlayerLeft);
            callback(lobbyAfterPlayerLeft);
            expect(lobbyAfterPlayerLeft.players.length).toBe(fullMockLobby.players.length - ONE_PLAYER_LEFT);
            expect(lobbyAfterPlayerLeft.players.length).toBe(fullMockLobby.maxPlayers - ONE_PLAYER_LEFT);
            expect(snackBarServiceSpy.showSnackBarPositive).toHaveBeenCalledWith("Le lobby n'est plus plein et a été déverrouillé.");
            expect(lobbyAfterPlayerLeft.locked).toBeFalse();
            expect(lobbyServiceSpy.toggleLockLobby).toHaveBeenCalledWith(false);
        });
        it('should handle PlayerJoined event with notification', async () => {
            await component.ngOnInit();
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;
            const callback = getCallbackForEvent(LobbyGatewayEvents.PlayerJoined);
            callback(mockLobby);
            expect(snackBarServiceSpy.showSnackBarPositive).toHaveBeenCalledWith('Un joueur a rejoint la partie.');
            expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
        });
        it('should handle PlayerLeft event with notification', async () => {
            await component.ngOnInit();
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;
            const callback = getCallbackForEvent(LobbyGatewayEvents.PlayerLeft);
            callback(mockLobby);
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Un joueur a quitté la partie.');
            expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
        });
        it('should handle LeaderLeft event and navigate to home', async () => {
            await component.ngOnInit();
            const callback = getCallbackForEvent(LobbyGatewayEvents.LeaderLeft);
            callback(null);
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Le leader a quitté la partie.');
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
            expect(lobbyServiceSpy.leaveLobby).toHaveBeenCalled();
        });
        it('should handle KickPlayer event', async () => {
            await component.ngOnInit();
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;
            const callback = getCallbackForEvent(LobbyGatewayEvents.KickPlayer);
            callback(mockLobby);
            expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
        });
        it('should handle KickPlayer event and unlock lobby if needed', async () => {
            await component.ngOnInit();
            const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
            component['handleLobbyData'] = handleLobbyDataSpy;

            component.isLocked = false;
            const lockedMockLobby = { ...mockLobby, locked: true };

            const callback = getCallbackForEvent(LobbyGatewayEvents.KickPlayer);
            callback(lockedMockLobby);

            expect(lockedMockLobby.locked).toBeFalse();
            expect(component['handleLobbyData']).toHaveBeenCalledWith(lockedMockLobby);
        });
        it('should handle kicked event and navigate to home', async () => {
            await component.ngOnInit();
            const callback = getCallbackForEvent(LobbyGatewayEvents.Kicked);
            callback(null);
            expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Vous avez été expulsé de la partie.');
            expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
            expect(lobbyServiceSpy.leaveLobby).toHaveBeenCalled();
        });
    });
    describe('handleLobbyData', () => {
        it('should update component properties with lobby data', async () => {
            await component['handleLobbyData'](mockLobby);
            expect(component.playerInfo).toEqual(mockLobby.players);
            expect((component as any).mapId).toBe(mockLobby.mapId);
            expect(component.roomCode).toBe(mockLobby.code);
            expect(component.maxPlayers).toBe(mockLobby.maxPlayers);
            expect((component as any).currentLobby).toEqual(mockLobby);
            expect(component.isLocked).toBe(mockLobby.locked);
        });
        it('should set isVisionLeader to true if current player is leader', async () => {
            const mockLobbyWithLeader = {
                ...mockLobby,
                players: [{ ...mockLobby.players[0], _id: 'player1', isLeader: true }],
            };
            lobbyServiceSpy.getSocketId.and.returnValue('player1');
            await component['handleLobbyData'](mockLobbyWithLeader);
            expect(component.isVisionLeader).toBeTrue();
        });
        it('should auto-lock lobby if it is full and player is leader', async () => {
            lobbyServiceSpy.getSocketId.and.returnValue('player1');
            spyOn(component, 'lockRoom');

            expect(mockFullLobbyWithCorrectLeader.players.length).toEqual(mockFullLobbyWithCorrectLeader.maxPlayers);
            await component['handleLobbyData'](mockFullLobbyWithCorrectLeader);

            expect(component.lockRoom).toHaveBeenCalled();
            expect(snackBarServiceSpy.showSnackBarPositive).toHaveBeenCalledWith('Le lobby est plein et a été automatiquement verrouillé.');
        });
        it('should fetch game info from mapId', async () => {
            await component['handleLobbyData'](mockLobby);

            expect(gameServiceSpy.getGameById).toHaveBeenCalledWith(mockLobby.mapId);
            expect(component.gameMode).toBe(mockGame.gameMode);
            expect(component.size).toBe(mockGame.gameGrid.size);
            expect(component.gridName).toBe(mockGame.name);
            expect(component.description).toBe(mockGame.description);
            expect(component.thumbnail).toBe(mockGame.thumbnail);
        });
    });
    describe('toggleChat', () => {
        it('should toggle isChatOpen', () => {
            component.isChatOpen = false;
            component.toggleChat();
            expect(component.isChatOpen).toBeTrue();
            component.toggleChat();
            expect(component.isChatOpen).toBeFalse();
        });
    });
    describe('createGame', () => {
        it('should call createGame with correct config', async () => {
            gameStateServiceSpy.createGame.and.returnValue(Promise.resolve('game-id'));
            component.roomCode = 'TEST123';
            (component as any).mapId = 'map123';
            component.playerInfo = [createMockPlayer(true), createMockPlayer(false)];
            const result = await (component as unknown as { createGame: () => Promise<string> }).createGame();

            expect(gameStateServiceSpy.createGame).toHaveBeenCalledWith({
                id: 'TEST123',
                mapId: 'map123',
                players: component.playerInfo,
            });
            expect(result).toBe('game-id');
        });
        it('should return service promise', async () => {
            const expectedResult = 'game-id';
            gameStateServiceSpy.createGame.and.returnValue(Promise.resolve(expectedResult));
            component.roomCode = 'TEST123';
            (component as any).mapId = 'map123';
            const result = await (component as unknown as { createGame: () => Promise<string> }).createGame();
            expect(result).toBe(expectedResult);
        });
    });
    it('should handle BotAdded event with notification', async () => {
        await component.ngOnInit();
        const handleLobbyDataSpy = jasmine.createSpy('handleLobbyData');
        component['handleLobbyData'] = handleLobbyDataSpy;
        const callback = getCallbackForEvent(LobbyGatewayEvents.BotAdded);
        callback(mockLobby);
        expect(snackBarServiceSpy.showSnackBarPositive).toHaveBeenCalledWith('Un bot a été rajouté.');
        expect(component['handleLobbyData']).toHaveBeenCalledWith(mockLobby);
    });
    it('should not start game if CTF game mode has odd number of players', () => {
        const oddPlayerCount = 3;
        const lobbyWithOddPlayers = {
            ...mockLobby,
            locked: true,
            players: Array(oddPlayerCount)
                .fill(0)
                .map((_, i) => createMockPlayer(i === 0)),
        };

        (component as any).currentLobby = lobbyWithOddPlayers;
        component.playerInfo = lobbyWithOddPlayers.players;
        component.maxPlayers = lobbyWithOddPlayers.maxPlayers;
        component.gameMode = GameModes.CTF;

        component.startGame();

        expect(snackBarServiceSpy.showSnackBar).toHaveBeenCalledWith('Le mode de jeu CTF nécessite un nombre pair de joueurs.');
        expect(lobbyServiceSpy.startGame).not.toHaveBeenCalled();
    });
});
