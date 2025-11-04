import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '@common/player/player';

@Component({
    selector: 'app-opponent-dialogue',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './opponent-dialogue.component.html',
    styleUrl: './opponent-dialogue.component.scss',
})
export class OpponentDialogueComponent {
    @Input() opponent: Player | null = null;
    @Input() showVictoryMessage: boolean = false;
    @Input() winnerName: string | null = null;
    @Input() isTargetDebuffed: boolean = false;

    getDisplayHealth(): number {
        return this.showVictoryMessage && this.winnerName !== this.opponent?.name ? 0 : this.opponent?.healthPower || 0;
    }
}
