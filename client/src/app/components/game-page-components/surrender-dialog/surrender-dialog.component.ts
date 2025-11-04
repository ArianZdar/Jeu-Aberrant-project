import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { CombatService } from '@app/services/combat/combat.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';

@Component({
    selector: 'app-surrender-dialog',
    imports: [CommonModule],
    templateUrl: './surrender-dialog.component.html',
    styleUrl: './surrender-dialog.component.scss',
})
export class SurrenderDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<SurrenderDialogComponent>,
        private gameStateService: GameStateService,
        private router: Router,
        private combatService: CombatService,
    ) {}

    onConfirm(): void {
        if (this.combatService.getCombatViewValue()) {
            this.gameStateService.makePlayerLoseCombat();
        }

        this.gameStateService.leaveGame();
        this.dialogRef.close(true);
        this.router.navigate(['/home']);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
