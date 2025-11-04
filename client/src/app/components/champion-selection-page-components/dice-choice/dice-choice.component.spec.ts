import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DiceChoiceComponent } from './dice-choice.component';

describe('DiceChoiceComponent', () => {
    let component: DiceChoiceComponent;
    let fixture: ComponentFixture<DiceChoiceComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [DiceChoiceComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(DiceChoiceComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('selectDice() should emit the selected dice', () => {
        spyOn(component.diceSelected, 'emit');

        const dice = 3;
        component.selectDice(dice);

        expect(component.diceSelected.emit).toHaveBeenCalledWith(dice);
    });
});
