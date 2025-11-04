import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CombatService } from '@app/services/combat/combat.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { SurrenderDialogComponent } from './surrender-dialog.component';

describe('SurrenderDialogComponent', () => {
    let component: SurrenderDialogComponent;
    let fixture: ComponentFixture<SurrenderDialogComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<SurrenderDialogComponent>>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let routerMock: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['makePlayerLoseCombat', 'leaveGame']);
        combatServiceMock = jasmine.createSpyObj('CombatService', ['getCombatViewValue']);
        routerMock = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [SurrenderDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(SurrenderDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog with true on confirm', () => {
        combatServiceMock.getCombatViewValue.and.returnValue(false);
        component.onConfirm();
        expect(dialogRefMock.close).toHaveBeenCalledWith(true);
    });

    it('should close dialog with false on cancel', () => {
        component.onCancel();
        expect(dialogRefMock.close).toHaveBeenCalledWith(false);
    });

    it('should call makePlayerLoseCombat when in combat view', () => {
        combatServiceMock.getCombatViewValue.and.returnValue(true);
        component.onConfirm();
        expect(gameStateServiceMock.makePlayerLoseCombat).toHaveBeenCalled();
        expect(gameStateServiceMock.leaveGame).toHaveBeenCalled();
        expect(dialogRefMock.close).toHaveBeenCalledWith(true);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should not call makePlayerLoseCombat when not in combat view', () => {
        combatServiceMock.getCombatViewValue.and.returnValue(false);
        component.onConfirm();
        expect(gameStateServiceMock.makePlayerLoseCombat).not.toHaveBeenCalled();
        expect(gameStateServiceMock.leaveGame).toHaveBeenCalled();
        expect(dialogRefMock.close).toHaveBeenCalledWith(true);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/home']);
    });
});
