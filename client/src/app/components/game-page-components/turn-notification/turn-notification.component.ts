import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
    MS_OF_ONE_SECOND,
    TRANSITION_DELAY_IN_SECOND,
    PROGRESS_MAX_VALUE,
    PROGRESS_HIGH_THRESHOLD,
    PROGRESS_LOW_THRESHOLD,
    PROGRESS_HIGH_RANGE,
    PROGRESS_LOW_RANGE,
    WOOD_COLOR,
    ORANGE_COLOR,
    RED_COLOR,
} from '@app/constants/client-constants';
@Component({
    selector: 'app-turn-notification-dialog',
    templateUrl: './turn-notification.component.html',
    styleUrls: ['./turn-notification.component.scss'],
    standalone: true,
    imports: [CommonModule, MatButtonModule, MatDialogModule],
})
export class TurnNotificationComponent implements OnInit, OnDestroy {
    countDown: number;
    progress: number;
    private startTime: number;
    private totalTime: number;
    private animationFrameId: number;

    constructor(
        public dialogRef: MatDialogRef<TurnNotificationComponent>,
        @Inject(MAT_DIALOG_DATA) public data: { playerName: string },
    ) {
        this.countDown = TRANSITION_DELAY_IN_SECOND;
        this.progress = PROGRESS_MAX_VALUE;
        this.totalTime = TRANSITION_DELAY_IN_SECOND * MS_OF_ONE_SECOND;
    }

    ngOnInit() {
        this.startTime = Date.now();
        this.updateProgressAndCountdown();
    }

    updateProgressAndCountdown() {
        const currentTime = Date.now();
        const elapsed = currentTime - this.startTime;
        const remaining = this.totalTime - elapsed;

        if (remaining <= 0) {
            this.countDown = 0;
            this.progress = 0;
            this.dialogRef.close();
            return;
        }

        this.countDown = Math.min(Math.ceil(remaining / MS_OF_ONE_SECOND), TRANSITION_DELAY_IN_SECOND);
        this.progress = (remaining / this.totalTime) * PROGRESS_MAX_VALUE;

        this.animationFrameId = requestAnimationFrame(() => this.updateProgressAndCountdown());
    }

    ngOnDestroy() {
        cancelAnimationFrame(this.animationFrameId);
    }

    closeIfClickedOutside(event: MouseEvent): void {
        if (event.target === event.currentTarget) {
            this.dialogRef.close();
        }
    }

    getProgressColor(): string {
        let r;
        let g;
        let b;

        if (this.progress >= PROGRESS_HIGH_THRESHOLD) {
            const ratio = (this.progress - PROGRESS_HIGH_THRESHOLD) / PROGRESS_HIGH_RANGE;
            r = Math.round(ORANGE_COLOR.r + ratio * (WOOD_COLOR.r - ORANGE_COLOR.r));
            g = Math.round(ORANGE_COLOR.g + ratio * (WOOD_COLOR.g - ORANGE_COLOR.g));
            b = Math.round(ORANGE_COLOR.b + ratio * (WOOD_COLOR.b - ORANGE_COLOR.b));
        } else if (this.progress >= PROGRESS_LOW_THRESHOLD) {
            const ratio = (this.progress - PROGRESS_LOW_THRESHOLD) / PROGRESS_LOW_RANGE;
            r = Math.round(RED_COLOR.r + ratio * (ORANGE_COLOR.r - RED_COLOR.r));
            g = Math.round(RED_COLOR.g + ratio * (ORANGE_COLOR.g - RED_COLOR.g));
            b = Math.round(RED_COLOR.b + ratio * (ORANGE_COLOR.b - RED_COLOR.b));
        } else {
            const ratio = this.progress / PROGRESS_LOW_THRESHOLD;
            r = RED_COLOR.r;
            g = Math.round(RED_COLOR.g * ratio);
            b = Math.round(RED_COLOR.b * ratio);
        }

        return `rgb(${r}, ${g}, ${b})`;
    }
}
