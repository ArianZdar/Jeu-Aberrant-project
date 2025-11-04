import { Component } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
    selector: 'app-delete-game-dialog',
    imports: [],
    templateUrl: './delete-game-dialog.component.html',
    styleUrl: './delete-game-dialog.component.scss',
})
export class DeleteGameDialogComponent {
    constructor(private readonly dialogRef: MatDialogRef<DeleteGameDialogComponent>) {}

    onConfirm(): void {
        this.dialogRef.close(true);
    }

    onCancel(): void {
        this.dialogRef.close(false);
    }
}
