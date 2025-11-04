import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';

@Component({
    selector: 'app-save-level-dialog',
    imports: [],
    templateUrl: './save-level-dialog.component.html',
    styleUrl: './save-level-dialog.component.scss',
})
export class SaveLevelDialogComponent {
    constructor(
        private dialogRef: MatDialogRef<SaveLevelDialogComponent>,
        private router: Router,
    ) {}

    onConfirm(): void {
        this.dialogRef.close(true);
        this.router.navigate(['/admin']);
    }
}
