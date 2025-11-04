import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Player } from '@common/player/player';
import { MS_OF_ONE_AND_HALF_SECOND } from '@app/constants/client-constants';
import { MAX_ESCAPES_ATTEMPTS } from '@common/game/game-info';
@Component({
    selector: 'app-combat-actions',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './combat-actions.component.html',
    styleUrl: './combat-actions.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CombatActionsComponent implements OnChanges {
    @Input() playerStats: Player | null = null;
    @Input() disableActions = false;
    @Input() forceZeroHealth = false;
    @Input() isAttackerDebuffed: boolean = false;
    @Output() attackClicked = new EventEmitter<void>();
    @Output() forfeitClicked = new EventEmitter<void>();

    isEscapeCountAnimating = false;
    private previousEscapeAttempts = 0;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['playerStats'] && this.playerStats) {
            const currentEscapeAttempts = this.playerStats.escapesAttempts || 0;
            if (currentEscapeAttempts > this.previousEscapeAttempts) {
                this.triggerEscapeAnimation();
            }
            this.previousEscapeAttempts = currentEscapeAttempts;
        }
    }

    onAttack(): void {
        this.attackClicked.emit();
    }

    onForfeit(): void {
        this.forfeitClicked.emit();
    }

    getRemainingEscapes(): number {
        const attempts = this.playerStats?.escapesAttempts || 0;
        return Math.max(0, MAX_ESCAPES_ATTEMPTS - attempts);
    }

    private triggerEscapeAnimation(): void {
        this.isEscapeCountAnimating = true;
        setTimeout(() => {
            this.isEscapeCountAnimating = false;
        }, MS_OF_ONE_AND_HALF_SECOND);
    }
}
