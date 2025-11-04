import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatViewTimerComponent } from './combat-view-timer.component';

describe('CombatViewTimerComponent', () => {
    let component: CombatViewTimerComponent;
    let fixture: ComponentFixture<CombatViewTimerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CombatViewTimerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatViewTimerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('timerLabel', () => {
        it('should return correct label when isInitialPhase is true', () => {
            component.isInitialPhase = true;
            expect(component.timerLabel).toBe('Le combat commence bientôt');
        });

        it('should return correct label when isInitialPhase is false and yourTurn is true', () => {
            component.isInitialPhase = false;
            component.yourTurn = true;
            expect(component.timerLabel).toBe('À vous de jouer !');
        });

        it('should return correct label when isInitialPhase is false and yourTurn is false', () => {
            component.isInitialPhase = false;
            component.yourTurn = false;
            expect(component.timerLabel).toBe('Tour adverse...');
        });
    });
});
