import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { CRITICAL_TIMER, TURN_TIMER } from '@app/constants/client-constants';
import { mockPlayers } from '@app/constants/mocks';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { BehaviorSubject } from 'rxjs';
import { PlayerInfosComponent } from './player-infos.component';

describe('PlayerInfosComponent', () => {
    let component: PlayerInfosComponent;
    let fixture: ComponentFixture<PlayerInfosComponent>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;

    const TEST_PLAYER_ID = 'player1';
    const OTHER_PLAYER_ID = 'other-player';
    const TEST_FIGHT_WINS = 3;
    const TEST_TIMER_VALUE = 15;
    const BELOW_CRITICAL_VALUE = CRITICAL_TIMER - 1;
    const ABOVE_CRITICAL_VALUE = CRITICAL_TIMER + 1;

    const currentTurnPlayerIdSubject = new BehaviorSubject<string | null>(null);
    const turnTimerSubject = new BehaviorSubject<number>(TURN_TIMER);
    const turnTimerPausedSubject = new BehaviorSubject<boolean>(false);
    const playerFightWinsSubject = new BehaviorSubject<number>(0);

    beforeEach(async () => {
        playerServiceMock = jasmine.createSpyObj('PlayerService', ['getCurrentTurnPlayerId', 'getPlayerFightWins', 'getTurnTimer']);
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['getTurnTimerPaused']);

        playerServiceMock.getCurrentTurnPlayerId.and.returnValue(currentTurnPlayerIdSubject);
        playerServiceMock.getTurnTimer.and.returnValue(turnTimerSubject);
        playerServiceMock.getPlayerFightWins.and.returnValue(playerFightWinsSubject);
        gameStateServiceMock.getTurnTimerPaused.and.returnValue(turnTimerPausedSubject);

        await TestBed.configureTestingModule({
            imports: [PlayerInfosComponent],
            providers: [
                { provide: PlayerService, useValue: playerServiceMock },
                { provide: GameStateService, useValue: gameStateServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerInfosComponent);
        component = fixture.componentInstance;
        component.ngOnInit();
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should correctly bind input properties', () => {
        const testPlayer = mockPlayers[0];
        component.username = testPlayer.name;
        component.champion = testPlayer.championName;
        component.nbFightsWon = testPlayer.nbFightsWon;
        component.isLeader = testPlayer.isLeader;
        component.playerId = testPlayer._id;
        component.isConnected = testPlayer.isConnected;

        fixture.detectChanges();

        expect(component.username).toBe(testPlayer.name);
        expect(component.champion).toBe(testPlayer.championName);
        expect(component.nbFightsWon).toBe(testPlayer.nbFightsWon);
        expect(component.isLeader).toBe(testPlayer.isLeader);
        expect(component.playerId).toBe(testPlayer._id);
        expect(component.isConnected).toBe(testPlayer.isConnected);
    });

    it('should update isTurn when currentTurnPlayerId changes', fakeAsync(() => {
        component.playerId = TEST_PLAYER_ID;
        fixture.detectChanges();

        expect(component.isTurn).toBe(false);

        currentTurnPlayerIdSubject.next(TEST_PLAYER_ID);
        tick();
        fixture.detectChanges();
        expect(component.isTurn).toBe(true);

        currentTurnPlayerIdSubject.next(OTHER_PLAYER_ID);
        tick();
        fixture.detectChanges();
        expect(component.isTurn).toBe(false);
    }));

    it('should update nbFightsWon when player wins change', fakeAsync(() => {
        component.playerId = TEST_PLAYER_ID;
        fixture.detectChanges();

        expect(component.nbFightsWon).toBe(0);

        playerFightWinsSubject.next(TEST_FIGHT_WINS);
        tick();
        fixture.detectChanges();
        expect(component.nbFightsWon).toBe(TEST_FIGHT_WINS);
    }));

    it('should update timerValue for the current player turn', fakeAsync(() => {
        component.playerId = TEST_PLAYER_ID;
        fixture.detectChanges();

        currentTurnPlayerIdSubject.next(TEST_PLAYER_ID);
        tick();
        fixture.detectChanges();

        turnTimerSubject.next(TEST_TIMER_VALUE);
        tick();
        fixture.detectChanges();

        expect(component.timerValue).toBe(TEST_TIMER_VALUE);
    }));

    it('should not update timerValue for other players', fakeAsync(() => {
        component.playerId = TEST_PLAYER_ID;
        component.timerValue = TURN_TIMER;
        fixture.detectChanges();

        currentTurnPlayerIdSubject.next(OTHER_PLAYER_ID);
        tick();
        fixture.detectChanges();

        turnTimerSubject.next(TEST_TIMER_VALUE);
        tick();
        fixture.detectChanges();

        expect(component.timerValue).toBe(TURN_TIMER);
    }));

    it('should update turnTimerPaused status', fakeAsync(() => {
        component.isTurnTimerPaused = false;
        turnTimerPausedSubject.next(false);
        tick();
        fixture.detectChanges();

        expect(component.isTurnTimerPaused).toBe(false);

        turnTimerPausedSubject.next(true);
        tick();
        fixture.detectChanges();
        expect(component.isTurnTimerPaused).toBe(true);
    }));

    it('should properly determine isTimerCritical based on conditions', fakeAsync(() => {
        component.playerId = TEST_PLAYER_ID;
        fixture.detectChanges();

        currentTurnPlayerIdSubject.next(OTHER_PLAYER_ID);
        tick();
        turnTimerSubject.next(BELOW_CRITICAL_VALUE);
        tick();
        turnTimerPausedSubject.next(false);
        tick();
        fixture.detectChanges();

        expect(component.isTimerCritical).toBe(false);

        currentTurnPlayerIdSubject.next(TEST_PLAYER_ID);
        tick();
        turnTimerSubject.next(ABOVE_CRITICAL_VALUE);
        tick();
        fixture.detectChanges();

        expect(component.isTimerCritical).toBe(false);

        currentTurnPlayerIdSubject.next(TEST_PLAYER_ID);
        tick();
        turnTimerSubject.next(BELOW_CRITICAL_VALUE);
        tick();
        fixture.detectChanges();

        expect(component.isTimerCritical).toBe(true);

        turnTimerPausedSubject.next(true);
        tick();
        fixture.detectChanges();

        expect(component.isTimerCritical).toBe(false);
    }));

    it('should unsubscribe from all subscriptions on destroy', () => {
        fixture.detectChanges();
        const unsubscribeSpy = spyOn(component['subscriptions'][0], 'unsubscribe').and.callThrough();

        component.ngOnDestroy();

        expect(unsubscribeSpy).toHaveBeenCalled();
    });
});
