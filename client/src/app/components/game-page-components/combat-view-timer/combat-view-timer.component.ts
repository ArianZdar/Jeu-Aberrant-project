import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-combat-view-timer',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-view-timer.component.html',
    styleUrl: './combat-view-timer.component.scss',
})
export class CombatViewTimerComponent {
    @Input() timerValue: number | null = null;
    @Input() yourTurn: boolean = false;
    @Input() isInitialPhase: boolean = true;

    get timerLabel(): string {
        return this.isInitialPhase ? 'Le combat commence bientôt' : this.yourTurn ? 'À vous de jouer !' : 'Tour adverse...';
    }
}
