import { ComponentFixture, TestBed } from '@angular/core/testing';
import { mockPlayers } from '@app/constants/mocks';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { BehaviorSubject } from 'rxjs';
import { PlayerListComponent } from './player-list.component';

type PlayersUpdatedEventHandler = () => void;
type TurnChangedEventHandler = (playerId: string) => void;
type EventHandler = PlayersUpdatedEventHandler | TurnChangedEventHandler;

describe('PlayerListComponent', () => {
    let component: PlayerListComponent;
    let fixture: ComponentFixture<PlayerListComponent>;
    let mockPlayerService: jasmine.SpyObj<PlayerService>;
    let mockGameStateService: jasmine.SpyObj<GameStateService>;
    let playersSubject: BehaviorSubject<Player[]>;
    let eventHandlers: Record<string, EventHandler> = {};

    beforeEach(async () => {
        playersSubject = new BehaviorSubject<Player[]>([]);

        mockPlayerService = jasmine.createSpyObj('PlayerService', ['updatePlayer', 'setCurrentTurnPlayerId']);
        Object.defineProperty(mockPlayerService, 'players$', { get: () => playersSubject.asObservable() });
        Object.defineProperty(mockPlayerService, 'players', { get: () => playersSubject.value });

        mockGameStateService = jasmine.createSpyObj('GameStateService', ['on', 'off', 'getPlayers']);
        mockGameStateService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            eventHandlers[event] = callback as unknown as EventHandler;
            return mockGameStateService;
        });
        mockGameStateService.getPlayers.and.resolveTo(mockPlayers);

        await TestBed.configureTestingModule({
            imports: [PlayerListComponent],
            providers: [
                { provide: PlayerService, useValue: mockPlayerService },
                { provide: GameStateService, useValue: mockGameStateService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerListComponent);
        component = fixture.componentInstance;
        eventHandlers = {};
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should subscribe to players$ from PlayerService', () => {
            component.ngOnInit();
            playersSubject.next(mockPlayers);
            expect(component.playersList).toEqual(mockPlayers);
        });

        it('should set up socket listeners for PlayersUpdated and TurnChanged events', () => {
            component.ngOnInit();
            expect(mockGameStateService.on).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded, jasmine.any(Function));
            expect(mockGameStateService.on).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated, jasmine.any(Function));
            expect(mockGameStateService.on).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged, jasmine.any(Function));
        });
    });

    describe('ngOnDestroy', () => {
        it('should remove socket listeners', () => {
            component.ngOnInit();
            component.ngOnDestroy();
            expect(mockGameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded);
            expect(mockGameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.PlayersUpdated);
            expect(mockGameStateService.off).toHaveBeenCalledWith(GameGatewayEvents.TurnChanged);
        });
    });

    describe('socket event handlers', () => {
        it('should update players when PlayersUpdated event is received', async () => {
            component.ngOnInit();
            eventHandlers[GameGatewayEvents.PlayersUpdated]('player 1');
            await fixture.whenStable();
            expect(mockGameStateService.getPlayers).toHaveBeenCalled();
            expect(mockPlayerService.updatePlayer).toHaveBeenCalledWith(mockPlayers);
        });

        it('should set current turn player when TurnChanged event is received', () => {
            const playerId = 'player1';
            component.ngOnInit();
            eventHandlers[GameGatewayEvents.TurnChanged](playerId);
            expect(mockPlayerService.setCurrentTurnPlayerId).toHaveBeenCalledWith(playerId);
        });

        it('should update players when PlayersUpdated event is received', async () => {
            component.ngOnInit();
            eventHandlers[GameGatewayEvents.PlayersUpdated]('player 1');
            await fixture.whenStable();
            expect(mockGameStateService.getPlayers).toHaveBeenCalled();
            expect(mockPlayerService.updatePlayer).toHaveBeenCalledWith(mockPlayers);
        });

        it('should update players when CombatEnded event is received', async () => {
            component.ngOnInit();
            eventHandlers[GameGatewayEvents.CombatEnded]('player 1');
            await fixture.whenStable();
            expect(mockGameStateService.getPlayers).toHaveBeenCalled();
            expect(mockPlayerService.updatePlayer).toHaveBeenCalledWith(mockPlayers);
        });
    });

    describe('players getter', () => {
        it('should return players from PlayerService', () => {
            playersSubject.next(mockPlayers);
            expect(component.players).toEqual(mockPlayers);
        });
    });
});
