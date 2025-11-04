import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

const MAX_POWER = 6;
const MIN_POWER = 4;
const POINTS_PER_POWER = 2;
const BONUS_POINTS = 2;

@Component({
    selector: 'app-power-bar',
    templateUrl: './power-bar.component.html',
    styleUrls: ['./power-bar.component.scss'],
    imports: [CommonModule, FormsModule],
})
export class PowerBarComponent {
    @Input() power: number = MIN_POWER;
    @Output() powerChange = new EventEmitter<number>();
    @Input() iconName: string = 'heart_icon';

    points: number = this.power * POINTS_PER_POWER;

    get pointsDisplay(): string {
        return this.power === MAX_POWER ? `${this.points} (+${BONUS_POINTS})` : `${this.points}`;
    }

    increasePower(): void {
        if (this.power < MAX_POWER) {
            this.power++;
            this.points += POINTS_PER_POWER;
            this.powerChange.emit(this.power);
        }
    }

    togglePower(): void {
        this.power = this.power === MAX_POWER ? MIN_POWER : MAX_POWER;
        this.points = this.power * POINTS_PER_POWER;
        this.powerChange.emit(this.power);
    }
}
