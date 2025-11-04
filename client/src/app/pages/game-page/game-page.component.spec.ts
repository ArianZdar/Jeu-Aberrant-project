/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { NO_ERRORS_SCHEMA, ElementRef } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Event, NavigationStart, Router } from '@angular/router';
import { SurrenderDialogComponent } from '@app/components/game-page-components/surrender-dialog/surrender-dialog.component';
import { mockFixedPlayer } from '@app/constants/mocks';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { GameObjects } from '@common/game/game-enums';
import { DELAY_BEFORE_RETURNING_TO_HOME_PAGE } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { GamePageComponent } from './game-page.component';
import { ChatService } from '@app/services/chat/chat.service';

describe('GamePageComponent', () => {
    let component: GamePageComponent;
    let fixture: ComponentFixture<GamePageComponent>;
    let playerService: jasmine.SpyObj<PlayerService>;
    let gameGridService: jasmine.SpyObj<GameGridService>;
    let gameStateService: jasmine.SpyObj<GameStateService> & {
        isDebugActive$: BehaviorSubject<boolean>;
        onHandlers: { [event: string]: (data: unknown) => void };
    };
    let lobbyService: jasmine.SpyObj<LobbyService>;
    let combatService: jasmine.SpyObj<CombatService> & {
        showCombatView$: BehaviorSubject<boolean>;
        attackMode$: BehaviorSubject<boolean>;
    };

    const chatService: jasmine.SpyObj<ChatService> = jasmine.createSpyObj('ChatService', ['resetToLobbyMode', 'enterAGame']);

    let snackBarService: jasmine.SpyObj<SnackBarService>;
    let router: jasmine.SpyObj<Router>;
    let routerEvents: Subject<Event>;
    let dialog: jasmine.SpyObj<MatDialog>;
    let activatedRoute: { snapshot: { paramMap: { get: jasmine.Spy } } };

    beforeEach(async () => {
        playerService = jasmine.createSpyObj('PlayerService', [
            'setPlayers',
            'getMainPlayerId',
            'getMainPlayer',
            'getCurrentTurnPlayerIdValue',
            'setCurrentTurnPlayerId',
            'updateTurnTimer',
            'updatePlayerFightWins',
            'updatePlayer',
            'reset',
        ]);
        playerService.isCurrentPlayerTurn = false;

        gameGridService = jasmine.createSpyObj('GameGridService', [
            'setGameId',
            'setPlayerId',
            'setTilesByGameId',
            'getTitle',
            'getSize',
            'updateReachableTiles',
            'reset',
            'setItems',
            'getGameId',
        ]);

        gameGridService.items = new Set([
            { position: { x: -1, y: -1 }, item: GameObjects.Armor },
            { position: { x: -1, y: -1 }, item: GameObjects.Bomb },
        ]);

        gameStateService = jasmine.createSpyObj('GameStateService', [
            'on',
            'off',
            'isSocketAlive',
            'joinGame',
            'getMapId',
            'getPlayers',
            'leaveGame',
            'activateDebugMode',
            'setIsDebugActive',
            'pauseTurnTimer',
            'reset',
            'getItems',
        ]) as jasmine.SpyObj<GameStateService> & {
            isDebugActive$: BehaviorSubject<boolean>;
            onHandlers: { [event: string]: (data: unknown) => void };
        };
        gameStateService.isDebugActive$ = new BehaviorSubject<boolean>(false);
        gameStateService.onHandlers = {};
        gameStateService.on.and.callFake((event: string, callback: unknown) => {
            gameStateService.onHandlers[event] = callback as (data: unknown) => void;
        });

        lobbyService = jasmine.createSpyObj('LobbyService', ['off', 'leaveLobby']);

        combatService = jasmine.createSpyObj('CombatService', ['getAttackModeValue', 'setAttackMode', 'reset']) as jasmine.SpyObj<CombatService> & {
            showCombatView$: BehaviorSubject<boolean>;
            attackMode$: BehaviorSubject<boolean>;
        };
        combatService.showCombatView$ = new BehaviorSubject<boolean>(false);
        combatService.attackMode$ = new BehaviorSubject<boolean>(false);

        snackBarService = jasmine.createSpyObj('SnackBarService', ['showSnackBarPositive']);

        routerEvents = new Subject<Event>();
        router = jasmine.createSpyObj('Router', ['navigate']);
        Object.defineProperty(router, 'events', { get: () => routerEvents });

        const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        dialogRefSpyObj.afterClosed.and.returnValue(of(true));

        dialog = jasmine.createSpyObj('MatDialog', ['open']);
        dialog.open.and.returnValue(dialogRefSpyObj);

        activatedRoute = {
            snapshot: {
                paramMap: {
                    get: jasmine.createSpy('get').and.returnValue('test-game-id'),
                },
            },
        };

        await TestBed.configureTestingModule({
            imports: [CommonModule, GamePageComponent],
            providers: [
                { provide: PlayerService, useValue: playerService },
                { provide: GameGridService, useValue: gameGridService },
                { provide: GameStateService, useValue: gameStateService },
                { provide: LobbyService, useValue: lobbyService },
                { provide: CombatService, useValue: combatService },
                { provide: SnackBarService, useValue: snackBarService },
                { provide: Router, useValue: router },
                { provide: ActivatedRoute, useValue: activatedRoute },
                { provide: MatDialog, useValue: dialog },
                { provide: ChatService, useValue: chatService },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();

        gameStateService.isSocketAlive.and.returnValue(true);
        gameStateService.joinGame.and.returnValue(Promise.resolve());
        gameStateService.getMapId.and.returnValue(Promise.resolve('test-map-id'));
        gameStateService.getPlayers.and.returnValue(Promise.resolve([mockFixedPlayer]));
        playerService.getCurrentTurnPlayerIdValue.and.returnValue('player1');
        playerService.getMainPlayerId.and.returnValue('player1');
        playerService.getMainPlayer.and.returnValue(mockFixedPlayer);
        gameGridService.setTilesByGameId.and.returnValue(Promise.resolve());
        gameGridService.updateReachableTiles.and.returnValue(Promise.resolve());
        gameGridService.getTitle.and.returnValue('Test Map');
        gameGridService.getSize.and.returnValue('(10x10)');
        combatService.getAttackModeValue.and.returnValue(false);

        fixture = TestBed.createComponent(GamePageComponent);
        component = fixture.componentInstance;
    });

    describe('Component Initialization', () => {
        it('should create', () => {
            expect(component).toBeTruthy();
        });

        it('should navigate to home if socket is not alive', async () => {
            gameStateService.isSocketAlive.and.returnValue(false);
            await component.ngOnInit();
            expect(router.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should handle navigation events', async () => {
            await component.ngOnInit();
            const navigationStart = new NavigationStart(1, '/another-page');
            routerEvents.next(navigationStart);
            expect(gameStateService.leaveGame).toHaveBeenCalled();
        });

        it('should subscribe to combat service observables', async () => {
            await component.ngOnInit();
            combatService.showCombatView$.next(true);
            expect(component.showCombatView).toBe(true);

            combatService.attackMode$.next(true);
            expect(component.isAttackModeActive).toBe(true);
        });
    });

    describe('UI Setup', () => {
        it('should use empty string when room id is null', async () => {
            activatedRoute.snapshot.paramMap.get.and.returnValue(null);

            gameStateService.joinGame.and.returnValue(Promise.resolve());
            gameStateService.getMapId.and.returnValue(Promise.resolve('test-map-id'));
            gameStateService.getPlayers.and.returnValue(Promise.resolve([mockFixedPlayer]));
            playerService.getMainPlayerId.and.returnValue('player1');
            playerService.getCurrentTurnPlayerIdValue.and.returnValue('player1');

            await component.setupUi();

            expect((component as any).gameId).toBe('');
            expect(gameGridService.setGameId).toHaveBeenCalledWith('');
            expect(gameStateService.joinGame).toHaveBeenCalledWith('');
            expect(component.initializationFinished).toBe(true);
        });

        it('should setup UI correctly with mainPlayerId', async () => {
            gameStateService.joinGame.and.returnValue(Promise.resolve());
            gameStateService.getMapId.and.returnValue(Promise.resolve('test-map-id'));
            gameStateService.getPlayers.and.returnValue(Promise.resolve([mockFixedPlayer]));
            playerService.getMainPlayerId.and.returnValue('player1');
            playerService.getCurrentTurnPlayerIdValue.and.returnValue('player1');

            await component.setupUi();

            expect(gameGridService.setPlayerId).toHaveBeenCalledWith('player1');
            expect(playerService.setCurrentTurnPlayerId).toHaveBeenCalledWith('player1');
            expect(component.initializationFinished).toBe(true);
        });

        it('should setup UI correctly when mainPlayerId is null', async () => {
            gameStateService.joinGame.and.returnValue(Promise.resolve());
            gameStateService.getMapId.and.returnValue(Promise.resolve('test-map-id'));
            gameStateService.getPlayers.and.returnValue(Promise.resolve([mockFixedPlayer]));
            playerService.getMainPlayerId.and.returnValue(null);
            playerService.getCurrentTurnPlayerIdValue.and.returnValue('player2');

            await component.setupUi();

            expect(gameGridService.setPlayerId).not.toHaveBeenCalled();
            expect(playerService.setCurrentTurnPlayerId).toHaveBeenCalledWith('player2');
            expect(component.initializationFinished).toBe(true);
        });

        it('should update reachable tiles when it is my turn during setupUi', async () => {
            gameStateService.joinGame.and.returnValue(Promise.resolve());
            gameStateService.getMapId.and.returnValue(Promise.resolve('test-map-id'));
            gameStateService.getPlayers.and.returnValue(Promise.resolve([mockFixedPlayer]));
            playerService.getMainPlayerId.and.returnValue('player1');
            playerService.getCurrentTurnPlayerIdValue.and.returnValue('player1');

            await component.setupUi();

            expect(gameGridService.updateReachableTiles).toHaveBeenCalled();
            expect(component.initializationFinished).toBe(true);
        });

        it('should get level title and size', () => {
            expect(component.getLevelTitle()).toBe('Test Map');
            expect(component.getLevelSize()).toBe('(10x10)');
        });

        it('should enter game chat mode during setupUi', async () => {
            await component.setupUi();
            expect(chatService.enterAGame).toHaveBeenCalled();
        });
    });

    describe('User Interactions', () => {
        it('should handle debug key press', () => {
            const mockElement = document.createElement('div');
            const event = new KeyboardEvent('keypress', { key: 'd' });
            Object.defineProperty(event, 'target', { value: mockElement });
            component.buttonDetect(event);
            expect((component as any).buttonPressed).toBe('d');
            expect(gameStateService.activateDebugMode).toHaveBeenCalled();
        });

        it('should open surrender dialog on surrender click and handle true result', () => {
            const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
            dialogRefSpyObj.afterClosed.and.returnValue(of(true));
            dialog.open.and.returnValue(dialogRefSpyObj);

            component.onSurrenderClick();
            expect(dialog.open).toHaveBeenCalledWith(SurrenderDialogComponent, {
                width: '30vw',
                disableClose: true,
            });
            expect(router.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should open surrender dialog on surrender click and handle false result', () => {
            const dialogRefSpyObj = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
            dialogRefSpyObj.afterClosed.and.returnValue(of(false));
            dialog.open.and.returnValue(dialogRefSpyObj);

            component.onSurrenderClick();
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should disable attack mode on background click', () => {
            combatService.getAttackModeValue.and.returnValue(true);
            component.onBackgroundClick();
            expect(combatService.setAttackMode).toHaveBeenCalledWith(false);
        });

        it('should not disable attack mode if not active on background click', () => {
            combatService.getAttackModeValue.and.returnValue(false);
            component.onBackgroundClick();
            expect(combatService.setAttackMode).not.toHaveBeenCalled();
        });

        it('should set shouldHideMessage to true when mouse is within message hover margin', () => {
            const mockElement = document.createElement('div');
            const mockRect = {
                top: 100,
                left: 100,
                bottom: 200,
                right: 200,
                height: 100,
                width: 100,
                x: 100,
                y: 100,
                toJSON: () => ({}),
            };

            component.attackMessageElement = {
                nativeElement: mockElement,
            } as ElementRef;

            spyOn(mockElement, 'getBoundingClientRect').and.returnValue(mockRect as DOMRect);

            component.isAttackModeActive = true;
            component.shouldHideMessage = false;

            const event = new MouseEvent('mousemove', {
                clientX: 105,
                clientY: 105,
            });

            component.onMouseMove(event);

            expect(component.shouldHideMessage).toBe(true);
        });

        it('should handle cases when message element is not found', () => {
            component.attackMessageElement = undefined as unknown as ElementRef;

            component.isAttackModeActive = true;
            component.shouldHideMessage = false;

            const mouseEvent = new MouseEvent('mousemove', {
                clientX: 100,
                clientY: 100,
            });

            component.onMouseMove(mouseEvent);
            expect(component.shouldHideMessage).toBe(false);
        });

        it('should handle cases when message element is not found', () => {
            spyOn(document, 'querySelector').and.returnValue(null);
            component.isAttackModeActive = true;
            component.shouldHideMessage = false;

            const mouseEvent = new MouseEvent('mousemove', {
                clientX: 100,
                clientY: 100,
            });

            component.onMouseMove(mouseEvent);
            expect(component.shouldHideMessage).toBe(false);
        });
    });

    describe('Event Handlers', () => {
        it('should handle the TurnChanged event when it is my turn', async () => {
            await component.ngOnInit();
            const turnChangedHandler = gameStateService.onHandlers[GameGatewayEvents.TurnChanged];
            playerService.getMainPlayerId.and.returnValue('player1');

            turnChangedHandler('player1');

            expect(playerService.isCurrentPlayerTurn).toBe(true);
            expect(gameGridService.updateReachableTiles).toHaveBeenCalled();
            expect(gameStateService.getPlayers).toHaveBeenCalled();
        });

        it('should handle the TurnChanged event when it is not my turn', async () => {
            await component.ngOnInit();
            const turnChangedHandler = gameStateService.onHandlers[GameGatewayEvents.TurnChanged];
            combatService.getAttackModeValue.and.returnValue(true);

            turnChangedHandler('player2');

            expect(playerService.isCurrentPlayerTurn).toBe(false);
            expect(combatService.setAttackMode).toHaveBeenCalledWith(false);
        });

        it('should handle the TimerTick event', async () => {
            await component.ngOnInit();
            const timerTickHandler = gameStateService.onHandlers[GameGatewayEvents.TimerTick];
            timerTickHandler(1);
            expect(playerService.updateTurnTimer).toHaveBeenCalledWith(1);
        });

        it('should handle the PlayerWonGame event', fakeAsync(async () => {
            await component.ngOnInit();
            const playerWonHandler = gameStateService.onHandlers[GameGatewayEvents.PlayerWonGame];
            playerWonHandler('Test Player');

            expect(snackBarService.showSnackBarPositive).toHaveBeenCalledWith('Le joueur Test Player a gagné la partie !');
            expect(gameStateService.pauseTurnTimer).toHaveBeenCalledWith('test-game-id');

            tick(DELAY_BEFORE_RETURNING_TO_HOME_PAGE);
            expect(router.navigate).toHaveBeenCalledWith(['/home']);
        }));

        it('should handle the FightWon event', async () => {
            await component.ngOnInit();
            const fightWonHandler = gameStateService.onHandlers[GameGatewayEvents.FightWon];
            fightWonHandler({ playerId: 'player1', wins: 1 });
            expect(playerService.updatePlayerFightWins).toHaveBeenCalledWith('player1', 1);
        });

        it('should handle the ToggleDebug event', async () => {
            await component.ngOnInit();
            const toggleDebugHandler = gameStateService.onHandlers[GameGatewayEvents.ToggleDebug];
            toggleDebugHandler(true);
            expect(gameStateService.setIsDebugActive).toHaveBeenCalledWith(true);
        });

        it('should handle the LastPlayerConnected event correctly', async () => {
            await component.ngOnInit();
            const data = { playerId: 'player1', wins: 3 };
            const lastPlayerHandler = gameStateService.onHandlers[GameGatewayEvents.LastPlayerConnected];

            lastPlayerHandler(data);

            expect(snackBarService.showSnackBarPositive).toHaveBeenCalledWith(
                "Tout le monde a quitté la partie! Redirection vers la page d'accueil.",
            );
            expect(gameStateService.leaveGame).toHaveBeenCalled();
            expect(router.navigate).toHaveBeenCalledWith(['/home']);
        });

        it('should handle the DeactivateDebug event correctly', async () => {
            await component.ngOnInit();
            const data = { playerId: 'player1', wins: 3 };
            const deactivateDebugHandler = gameStateService.onHandlers[GameGatewayEvents.DeactivateDebug];

            deactivateDebugHandler(data);

            expect(gameStateService.setIsDebugActive).toHaveBeenCalledWith(false);
        });
    });

    describe('Component Cleanup', () => {
        it('should clean up on destroy', () => {
            (component as any).routerSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);
            (component as any).navigationSubscription = jasmine.createSpyObj('Subscription', ['unsubscribe']);

            component.ngOnDestroy();

            expect((component as any).routerSubscription.unsubscribe).toHaveBeenCalled();
            expect((component as any).navigationSubscription.unsubscribe).toHaveBeenCalled();

            expect(gameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged);
            expect(gameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.TimerTick);
            expect(gameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.FightWon);
            expect(gameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.ToggleDebug);
            expect(gameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.DeactivateDebug);

            expect(playerService.reset).toHaveBeenCalled();
            expect(combatService.reset).toHaveBeenCalled();
            expect(gameGridService.reset).toHaveBeenCalled();
            expect(gameStateService.reset).toHaveBeenCalled();
            expect(chatService.resetToLobbyMode).toHaveBeenCalled();
        });
    });

    describe('buttonDetect keypress handling', () => {
        it('should ignore keypresses in INPUT elements', () => {
            const inputElement = document.createElement('input');

            const event = new KeyboardEvent('keypress', { key: 'd' });
            Object.defineProperty(event, 'target', { value: inputElement });

            component.buttonDetect(event);

            expect(gameStateService.activateDebugMode).not.toHaveBeenCalled();
            expect((component as any).buttonPressed).toBeUndefined();
        });

        it('should ignore keypresses in TEXTAREA elements', () => {
            const textareaElement = document.createElement('textarea');

            const event = new KeyboardEvent('keypress', { key: 'd' });
            Object.defineProperty(event, 'target', { value: textareaElement });

            component.buttonDetect(event);

            expect(gameStateService.activateDebugMode).not.toHaveBeenCalled();
            expect((component as any).buttonPressed).toBeUndefined();
        });

        it('should ignore keypresses in contentEditable elements', () => {
            const editableElement = document.createElement('div');
            editableElement.contentEditable = 'true';

            const event = new KeyboardEvent('keypress', { key: 'd' });
            Object.defineProperty(event, 'target', { value: editableElement });

            component.buttonDetect(event);

            expect(gameStateService.activateDebugMode).not.toHaveBeenCalled();
            expect((component as any).buttonPressed).toBeUndefined();
        });

        it('should process keypresses in non-input elements', () => {
            const divElement = document.createElement('div');

            const event = new KeyboardEvent('keypress', { key: 'd' });
            Object.defineProperty(event, 'target', { value: divElement });

            gameStateService.activateDebugMode.calls.reset();

            component.buttonDetect(event);

            expect((component as any).buttonPressed).toBe('d');
            expect(gameStateService.activateDebugMode).toHaveBeenCalled();
        });
    });

    it('should pause turn timer when player has more than 2 items and timer is at 1 second', async () => {
        await component.ngOnInit();
        const timerTickHandler = gameStateService.onHandlers[GameGatewayEvents.TimerTick];

        const mockPlayer = {
            ...mockFixedPlayer,
            items: [
                { position: { x: 0, y: 0 }, item: GameObjects.Armor },
                { position: { x: 0, y: 0 }, item: GameObjects.Bomb },
                { position: { x: 0, y: 0 }, item: GameObjects.Flag },
            ],
        };
        playerService.getMainPlayer.and.returnValue(mockPlayer);
        gameGridService.getGameId.and.returnValue('test-game-id');

        timerTickHandler(1);

        expect(playerService.updateTurnTimer).toHaveBeenCalledWith(1);
        expect(gameStateService.pauseTurnTimer).toHaveBeenCalledWith('test-game-id');
    });

    it('should not pause turn timer when player has 2 or fewer items and timer is at 1 second', async () => {
        await component.ngOnInit();
        const timerTickHandler = gameStateService.onHandlers[GameGatewayEvents.TimerTick];

        const mockPlayer = {
            ...mockFixedPlayer,
            items: [
                { position: { x: 0, y: 0 }, item: GameObjects.Armor },
                { position: { x: 0, y: 0 }, item: GameObjects.Bomb },
            ],
        };
        playerService.getMainPlayer.and.returnValue(mockPlayer);

        timerTickHandler(1);

        expect(playerService.updateTurnTimer).toHaveBeenCalledWith(1);
        expect(gameStateService.pauseTurnTimer).not.toHaveBeenCalled();
    });

    it('should not pause turn timer when timer is greater than 1 second, regardless of items count', async () => {
        await component.ngOnInit();
        const timerTickHandler = gameStateService.onHandlers[GameGatewayEvents.TimerTick];

        const mockPlayer = {
            ...mockFixedPlayer,
            items: [
                { position: { x: 0, y: 0 }, item: GameObjects.Armor },
                { position: { x: 0, y: 0 }, item: GameObjects.Bomb },
                { position: { x: 0, y: 0 }, item: GameObjects.Flag },
                { position: { x: 0, y: 0 }, item: GameObjects.GladiatorHelm },
            ],
        };
        playerService.getMainPlayer.and.returnValue(mockPlayer);

        timerTickHandler(2);

        expect(playerService.updateTurnTimer).toHaveBeenCalledWith(2);
        expect(gameStateService.pauseTurnTimer).not.toHaveBeenCalled();
    });

    it('should handle the TeamWon event correctly', fakeAsync(async () => {
        await component.ngOnInit();
        const teamWonHandler = gameStateService.onHandlers[GameGatewayEvents.TeamWon];

        teamWonHandler('Red');

        expect(snackBarService.showSnackBarPositive).toHaveBeenCalledWith("L'équipe Red a gagné la partie !");

        expect(gameStateService.pauseTurnTimer).toHaveBeenCalledWith('test-game-id');

        tick(DELAY_BEFORE_RETURNING_TO_HOME_PAGE);

        expect(gameStateService.leaveGame).toHaveBeenCalled();
        expect(router.navigate).toHaveBeenCalledWith(['/home']);
    }));
});
