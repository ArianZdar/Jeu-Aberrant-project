import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
    providedIn: 'root',
})
export class SnackBarService {
    constructor(private snackBar: MatSnackBar) {}

    showSnackBar(message: string): void {
        this.snackBar.open(message, 'Fermer', {
            duration: 5000,
            panelClass: ['custom-snackbar'],
        });
    }

    showTransitiveSnackBar(message: string): void {
        this.snackBar.open(message, 'Fermer', {
            duration: 3000,
            panelClass: ['custom-snackbar-positive'],
        });
    }

    showSnackBarPositive(message: string): void {
        this.snackBar.open(message, 'Fermer', {
            duration: 4000,
            panelClass: ['custom-snackbar-positive'],
        });
    }
}
