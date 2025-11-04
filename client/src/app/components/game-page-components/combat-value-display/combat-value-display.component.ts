import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { DiceImageService } from '@app/services/dice-image/dice-image.service';

@Component({
    selector: 'app-combat-value-display',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-value-display.component.html',
    styleUrl: './combat-value-display.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CombatValueDisplayComponent {
    @Input() value: number = 0;
    @Input() diceType: number = 0;
    @Input() isAttack = false;
    @Input() isDefense = false;

    actualValue: number = 1;

    constructor(private imagePreloader: DiceImageService) {}

    get diceImageUrl(): string {
        return this.imagePreloader.getDiceImageUrl(this.diceType);
    }
}
