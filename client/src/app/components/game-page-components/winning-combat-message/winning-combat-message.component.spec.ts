import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WinningCombatMessageComponent } from './winning-combat-message.component';

describe('WinningCombatMessageComponent', () => {
    let component: WinningCombatMessageComponent;
    let fixture: ComponentFixture<WinningCombatMessageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [WinningCombatMessageComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(WinningCombatMessageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should emit closeMessagePopup event when closeMessage is called', () => {
        const emitSpy = spyOn(component.closeMessagePopup, 'emit');
        component.closeMessage();
        expect(emitSpy).toHaveBeenCalled();
    });

    it('should initialize with default values', () => {
        expect(component.winnerName).toBe('');
        expect(component.winnerChampion).toBe('');
        expect(component.visible).toBeFalse();
    });
});
