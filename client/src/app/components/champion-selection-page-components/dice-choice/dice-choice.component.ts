import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
    selector: 'app-dice-choice',
    templateUrl: './dice-choice.component.html',
    styleUrls: ['./dice-choice.component.scss'],
})
export class DiceChoiceComponent {
    @Input() selectedDice: number | null = null;
    @Input() grayedOutDice: number | null = null;

    @Output() diceSelected = new EventEmitter<number>();

    selectDice(dice: number): void {
        this.diceSelected.emit(dice);
    }
}
