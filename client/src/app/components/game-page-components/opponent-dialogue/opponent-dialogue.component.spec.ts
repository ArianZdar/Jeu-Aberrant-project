import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpponentDialogueComponent } from './opponent-dialogue.component';

describe('OpponentDialogueComponent', () => {
    let component: OpponentDialogueComponent;
    let fixture: ComponentFixture<OpponentDialogueComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [OpponentDialogueComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(OpponentDialogueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return correct health power when showVictoryMessage is true', () => {
        component.showVictoryMessage = true;
        component.winnerName = 'winner';
        if (component.opponent) {
            component.opponent.name = 'opponentName';
        }
        if (component.showVictoryMessage && component.winnerName !== component.opponent?.name) {
            expect(component.getDisplayHealth()).toBe(0);
        } else {
            expect(component.getDisplayHealth()).toBe(component.opponent?.healthPower || 0);
        }
    });
});
