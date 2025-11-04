import { SimpleChange, SimpleChanges } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { mockFixedPlayer } from '@app/constants/mocks';
import { MAX_ESCAPES_ATTEMPTS } from '@common/game/game-info';
import { Player } from '@common/player/player';
import { CombatActionsComponent } from './combat-actions.component';
import { MS_OF_ONE_AND_HALF_SECOND } from '@app/constants/client-constants';

describe('CombatActionsComponent', () => {
    let component: CombatActionsComponent;
    let fixture: ComponentFixture<CombatActionsComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CombatActionsComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatActionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit attack event when onAttack is called', () => {
        spyOn(component.attackClicked, 'emit');
        component.onAttack();
        expect(component.attackClicked.emit).toHaveBeenCalled();
    });

    it('should emit forfeit event when onForfeit is called', () => {
        spyOn(component.forfeitClicked, 'emit');
        component.onForfeit();
        expect(component.forfeitClicked.emit).toHaveBeenCalled();
    });

    it('should return correct number of remaining escapes', () => {
        component.playerStats = null;
        expect(component.getRemainingEscapes()).toBe(MAX_ESCAPES_ATTEMPTS);

        const playerNoEscapes: Player = { ...mockFixedPlayer, escapesAttempts: 0 };
        component.playerStats = playerNoEscapes;
        expect(component.getRemainingEscapes()).toBe(MAX_ESCAPES_ATTEMPTS);

        const playerWithEscapes: Player = { ...mockFixedPlayer, escapesAttempts: 1 };
        component.playerStats = playerWithEscapes;
        expect(component.getRemainingEscapes()).toBe(MAX_ESCAPES_ATTEMPTS - 1);

        const playerMaxEscapes: Player = { ...mockFixedPlayer, escapesAttempts: MAX_ESCAPES_ATTEMPTS };
        component.playerStats = playerMaxEscapes;
        expect(component.getRemainingEscapes()).toBe(0);

        const playerExcessEscapes: Player = { ...mockFixedPlayer, escapesAttempts: MAX_ESCAPES_ATTEMPTS + 1 };
        component.playerStats = playerExcessEscapes;
        expect(component.getRemainingEscapes()).toBe(0);
    });

    it('should trigger escape animation when escape attempts increase', () => {
        const playerInitial: Player = { ...mockFixedPlayer, escapesAttempts: 0 };
        component.playerStats = playerInitial;

        const changes: SimpleChanges = {
            playerStats: new SimpleChange(null, playerInitial, true),
        };
        component.ngOnChanges(changes);
        expect(component.isEscapeCountAnimating).toBeFalse();

        const playerAfterEscape = { ...playerInitial, escapesAttempts: 1 };
        const changesAfterEscape: SimpleChanges = {
            playerStats: new SimpleChange(playerInitial, playerAfterEscape, false),
        };
        component.playerStats = playerAfterEscape;
        component.ngOnChanges(changesAfterEscape);

        expect(component.isEscapeCountAnimating).toBeTrue();
    });

    it('should not trigger escape animation when escape attempts remain the same', () => {
        const player: Player = { ...mockFixedPlayer, escapesAttempts: 1 };
        component.playerStats = player;

        const initialChanges: SimpleChanges = {
            playerStats: new SimpleChange(null, player, true),
        };
        component.ngOnChanges(initialChanges);

        component.isEscapeCountAnimating = false;

        const samePlayer = { ...player };
        const changes: SimpleChanges = {
            playerStats: new SimpleChange(player, samePlayer, false),
        };
        component.playerStats = samePlayer;
        component.ngOnChanges(changes);

        expect(component.isEscapeCountAnimating).toBeFalse();
    });

    it('should reset isEscapeCountAnimating to false after animation duration', fakeAsync(() => {
        const playerInitial: Player = { ...mockFixedPlayer, escapesAttempts: 0 };
        component.playerStats = playerInitial;

        const playerAfterEscape = { ...playerInitial, escapesAttempts: 1 };
        const changes: SimpleChanges = {
            playerStats: new SimpleChange(playerInitial, playerAfterEscape, false),
        };

        component.playerStats = playerAfterEscape;
        component.ngOnChanges(changes);

        expect(component.isEscapeCountAnimating).toBeTrue();

        tick(MS_OF_ONE_AND_HALF_SECOND);

        expect(component.isEscapeCountAnimating).toBeFalse();
    }));
});
