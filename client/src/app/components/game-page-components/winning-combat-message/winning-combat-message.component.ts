import { Component, Input, ChangeDetectionStrategy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-winning-combat-message',
    imports: [CommonModule],
    templateUrl: './winning-combat-message.component.html',
    styleUrls: ['./winning-combat-message.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WinningCombatMessageComponent {
    @Input() winnerName: string = '';
    @Input() winnerChampion: string = '';
    @Input() visible: boolean = false;
    @Output() closeMessagePopup = new EventEmitter<void>();

    closeMessage(): void {
        this.closeMessagePopup.emit();
    }
}
