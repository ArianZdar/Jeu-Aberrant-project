import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-locked-lobby-popup',
    imports: [MatDialogModule],
    templateUrl: './locked-lobby-popup.component.html',
    styleUrl: './locked-lobby-popup.component.scss',
})
export class LockedLobbyPopupComponent {
    constructor(
        public dialogRef: MatDialogRef<LockedLobbyPopupComponent>,
        private router: Router,
    ) {}

    onRetry(): void {
        this.dialogRef.close('retry');
    }

    onReturnHome(): void {
        this.dialogRef.close('home');
        this.router.navigate(['/']);
    }
}
