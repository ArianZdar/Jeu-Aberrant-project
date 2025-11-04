/* eslint-disable @typescript-eslint/no-explicit-any */
import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { mockPlayers } from '@app/constants/mocks';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { BehaviorSubject, of } from 'rxjs';
import { PlayerSidebarComponent } from './player-sidebar.component';

@Component({
    selector: 'app-game-character-info',
    template: '',
    standalone: true,
})
class MockGameCharacterInfoComponent {
    @Input() displayChangeButton: boolean;
}

describe('PlayerSidebarComponent', () => {
    let component: PlayerSidebarComponent;
    let fixture: ComponentFixture<PlayerSidebarComponent>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let gameGridServiceMock: unknown;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;

    const mockMainPlayer = mockPlayers[0];
    const mockCombatSubject = new BehaviorSubject<boolean>(false);

    beforeEach(async () => {
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['getPlayerStats', 'getPlayers', 'nextTurn', 'off']);
        gameStateServiceMock.getPlayerStats.and.returnValue(of(mockMainPlayer));
        gameStateServiceMock.getPlayers.and.resolveTo(mockPlayers);

        combatServiceMock = jasmine.createSpyObj('CombatService', ['toggleAttackMode']);
        Object.defineProperty(combatServiceMock, 'showCombatView$', {
            get: () => mockCombatSubject.asObservable(),
        });

        gameGridServiceMock = {
            gameId: 'test-game-id',
        };

        playerServiceMock = jasmine.createSpyObj('PlayerService', ['getMainPlayer', 'getCurrentTurnPlayerIdValue', 'getMainPlayerId']);
        playerServiceMock.getMainPlayer.and.returnValue(mockMainPlayer);
        playerServiceMock.getCurrentTurnPlayerIdValue.and.returnValue('player1');
        playerServiceMock.getMainPlayerId.and.returnValue('player1');

        await TestBed.configureTestingModule({
            imports: [PlayerSidebarComponent, CommonModule],
            providers: [
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: GameGridService, useValue: gameGridServiceMock },
                { provide: PlayerService, useValue: playerServiceMock },
            ],
        })
            .overrideComponent(PlayerSidebarComponent, {
                set: {
                    imports: [MockGameCharacterInfoComponent, CommonModule],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(PlayerSidebarComponent);
        component = fixture.componentInstance;
        component.title = 'Test Title';
        component.size = 'medium';
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize player data on ngOnInit', fakeAsync(() => {
        component.ngOnInit();
        tick();

        expect(gameStateServiceMock.getPlayerStats).toHaveBeenCalled();
        expect(gameStateServiceMock.getPlayers).toHaveBeenCalled();
        expect((component as any).mainPlayer).toEqual(mockMainPlayer);
        expect((component as any).mainPlayerId).toEqual(mockMainPlayer._id);
        expect((component as any).players).toEqual(mockPlayers);
    }));

    it('should set selectedTargetId to opponent ID', fakeAsync(() => {
        component.ngOnInit();
        tick();

        expect((component as any).selectedTargetId).not.toEqual(mockMainPlayer._id);
    }));

    it('should toggle attack mode when handleAttack is called', () => {
        component.handleAttack();

        expect(combatServiceMock.toggleAttackMode).toHaveBeenCalled();
    });

    it('should clean up subscriptions on destroy', () => {
        const nextSpy = spyOn(component['destroy$'], 'next');
        const completeSpy = spyOn(component['destroy$'], 'complete');

        component.ngOnDestroy();

        expect(nextSpy).toHaveBeenCalled();
        expect(completeSpy).toHaveBeenCalled();
    });

    it('should call gameStateService.nextTurn with correct gameId when nextTurn is called', () => {
        component.nextTurn();
        expect(gameStateServiceMock.nextTurn).toHaveBeenCalledWith('test-game-id');
    });

    it('should update isInCombat when combat view changes', fakeAsync(() => {
        component.ngOnInit();
        tick();

        expect((component as any).isInCombat).toBeFalse();
        mockCombatSubject.next(true);
        tick();
        expect((component as any).isInCombat).toBeTrue();
    }));

    it('should return true from hasEnoughActionPoints when player has action points', () => {
        const playerWithActionPoints = { ...mockMainPlayer, actionPoints: 1 };
        playerServiceMock.getMainPlayer.and.returnValue(playerWithActionPoints);

        expect(component.hasEnoughActionPoints()).toBeTrue();
    });

    it('should return false from hasEnoughActionPoints when player has no action points', () => {
        const noActionPointsPlayer = { ...mockMainPlayer, actionPoints: 0 };
        playerServiceMock.getMainPlayer.and.returnValue(noActionPointsPlayer);

        expect(component.hasEnoughActionPoints()).toBeFalse();
    });

    it('should return true from isPlayerTurn when it is the player turn', () => {
        playerServiceMock.getCurrentTurnPlayerIdValue.and.returnValue('player1');
        playerServiceMock.getMainPlayerId.and.returnValue('player1');

        expect(component.isPlayerTurn).toBeTrue();
    });

    it('should return false from isPlayerTurn when it is not the player turn', () => {
        playerServiceMock.getCurrentTurnPlayerIdValue.and.returnValue('player2');
        playerServiceMock.getMainPlayerId.and.returnValue('player1');

        expect(component.isPlayerTurn).toBeFalse();
    });
});
