import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed, fakeAsync, flush, tick } from '@angular/core/testing';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import {
    MS_OF_ONE_SECOND,
    ORANGE_COLOR,
    PROGRESS_HIGH_RANGE,
    PROGRESS_HIGH_THRESHOLD,
    PROGRESS_LOW_RANGE,
    PROGRESS_LOW_THRESHOLD,
    PROGRESS_MAX_VALUE,
    RED_COLOR,
    TRANSITION_DELAY_IN_SECOND,
    WOOD_COLOR,
} from '@app/constants/client-constants';
import { TurnNotificationComponent } from './turn-notification.component';

describe('TurnNotificationComponent', () => {
    const FRAME_RATE_MS = 16;
    const ONE_SECOND_ELAPSED = MS_OF_ONE_SECOND;
    const TIME_EXPIRED = MS_OF_ONE_SECOND * (TRANSITION_DELAY_IN_SECOND + 1);
    const TOTAL_DIALOG_TIME_MS = TRANSITION_DELAY_IN_SECOND * MS_OF_ONE_SECOND;
    const REMAINING_TIME_MS = TOTAL_DIALOG_TIME_MS - ONE_SECOND_ELAPSED;
    const MOCK_ANIMATION_ID = 123;
    const HIGH_PROGRESS_VALUE = PROGRESS_HIGH_THRESHOLD + PROGRESS_HIGH_RANGE / 2;
    const MEDIUM_PROGRESS_VALUE = PROGRESS_LOW_THRESHOLD + PROGRESS_LOW_RANGE / 2;
    const LOW_PROGRESS_VALUE = PROGRESS_LOW_THRESHOLD / 2;

    let component: TurnNotificationComponent;
    let fixture: ComponentFixture<TurnNotificationComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<TurnNotificationComponent>>;
    let originalRequestAnimationFrame: typeof window.requestAnimationFrame;
    let mockRequestAnimationFrame: jasmine.Spy<typeof window.requestAnimationFrame>;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);

        originalRequestAnimationFrame = window.requestAnimationFrame;

        mockRequestAnimationFrame = jasmine.createSpy('requestAnimationFrame').and.callFake((callback: FrameRequestCallback) => {
            return setTimeout(() => callback(0), FRAME_RATE_MS);
        });

        window.requestAnimationFrame = mockRequestAnimationFrame as typeof window.requestAnimationFrame;

        await TestBed.configureTestingModule({
            imports: [TurnNotificationComponent, CommonModule, MatButtonModule, MatDialogModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: MAT_DIALOG_DATA, useValue: { playerName: 'TestPlayer' } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TurnNotificationComponent);
        component = fixture.componentInstance;

        spyOn(component, 'updateProgressAndCountdown').and.callThrough();

        fixture.detectChanges();
    });

    afterEach(() => {
        window.requestAnimationFrame = originalRequestAnimationFrame;
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with correct values', () => {
        expect(component.countDown).toBe(TRANSITION_DELAY_IN_SECOND);
        expect(component.data.playerName).toBe('TestPlayer');
    });

    it('should start countdown and update progress on init', () => {
        expect(component.updateProgressAndCountdown).toHaveBeenCalled();
    });

    describe('updateProgressAndCountdown', () => {
        it('should update progress and countdown values based on elapsed time', fakeAsync(() => {
            spyOn(Date, 'now').and.returnValue(component['startTime'] + ONE_SECOND_ELAPSED);

            (component.updateProgressAndCountdown as jasmine.Spy).calls.reset();

            component.updateProgressAndCountdown();

            tick(FRAME_RATE_MS);

            const expectedProgress = (REMAINING_TIME_MS / TOTAL_DIALOG_TIME_MS) * PROGRESS_MAX_VALUE;
            expect(component.countDown).toBe(TRANSITION_DELAY_IN_SECOND - 1);
            expect(component.progress).toBeCloseTo(expectedProgress);

            expect(mockRequestAnimationFrame).toHaveBeenCalled();
        }));

        it('should close the dialog when time is up', fakeAsync(() => {
            spyOn(Date, 'now').and.returnValue(component['startTime'] + TIME_EXPIRED);

            component.updateProgressAndCountdown();

            expect(dialogRefMock.close).toHaveBeenCalled();
            expect(component.countDown).toBe(0);
            expect(component.progress).toBe(0);

            expect(mockRequestAnimationFrame.calls.count()).toBe(1);

            flush();
        }));
    });

    describe('ngOnDestroy', () => {
        it('should cancel animation frame', fakeAsync(() => {
            spyOn(window, 'cancelAnimationFrame');
            component['animationFrameId'] = MOCK_ANIMATION_ID;

            component.ngOnDestroy();

            expect(window.cancelAnimationFrame).toHaveBeenCalledWith(MOCK_ANIMATION_ID);
            flush();
        }));
    });

    describe('closeIfClickedOutside', () => {
        it('should close dialog when clicking on the backdrop', () => {
            const element = document.createElement('div');
            const mockEvent = {
                target: element,
                currentTarget: element,
            } as unknown as MouseEvent;

            component.closeIfClickedOutside(mockEvent);

            expect(dialogRefMock.close).toHaveBeenCalled();
        });

        it('should not close dialog when clicking on dialog content', () => {
            dialogRefMock.close.calls.reset();

            const currentTarget = document.createElement('div');
            const target = document.createElement('button');
            const mockEvent = {
                target,
                currentTarget,
            } as unknown as MouseEvent;

            component.closeIfClickedOutside(mockEvent);

            expect(dialogRefMock.close).not.toHaveBeenCalled();
        });
    });

    describe('getProgressColor', () => {
        it('should return wood color when progress is high', () => {
            component.progress = PROGRESS_MAX_VALUE;
            const color = component.getProgressColor();
            expect(color).toBe(`rgb(${WOOD_COLOR.r}, ${WOOD_COLOR.g}, ${WOOD_COLOR.b})`);
        });

        it('should return orange color when progress is at threshold', () => {
            component.progress = PROGRESS_HIGH_THRESHOLD;
            const color = component.getProgressColor();
            expect(color).toBe(`rgb(${ORANGE_COLOR.r}, ${ORANGE_COLOR.g}, ${ORANGE_COLOR.b})`);
        });

        it('should return color between orange and wood when progress is high', () => {
            component.progress = HIGH_PROGRESS_VALUE;

            const color = component.getProgressColor();

            const ratio = (component.progress - PROGRESS_HIGH_THRESHOLD) / PROGRESS_HIGH_RANGE;
            const expectedR = Math.round(ORANGE_COLOR.r + ratio * (WOOD_COLOR.r - ORANGE_COLOR.r));
            const expectedG = Math.round(ORANGE_COLOR.g + ratio * (WOOD_COLOR.g - ORANGE_COLOR.g));
            const expectedB = Math.round(ORANGE_COLOR.b + ratio * (WOOD_COLOR.b - ORANGE_COLOR.b));

            expect(color).toBe(`rgb(${expectedR}, ${expectedG}, ${expectedB})`);
        });

        it('should return color between red and orange when progress is medium', () => {
            component.progress = MEDIUM_PROGRESS_VALUE;

            const color = component.getProgressColor();

            expect(color).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
        });

        it('should return red color with reduced intensity when progress is low', () => {
            component.progress = LOW_PROGRESS_VALUE;

            const color = component.getProgressColor();

            const ratio = component.progress / PROGRESS_LOW_THRESHOLD;
            const expectedG = Math.round(RED_COLOR.g * ratio);
            const expectedB = Math.round(RED_COLOR.b * ratio);

            expect(color).toBe(`rgb(${RED_COLOR.r}, ${expectedG}, ${expectedB})`);
        });
    });
});
