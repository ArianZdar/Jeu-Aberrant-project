import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';

import { SnackBarService } from './snack-bar.service';

const STANDARD_DURATION = 5000;
const POSITIVE_DURATION = 4000;
const TRANSITIVE_DURATION = 3000;

const STANDARD_PANEL_CLASS = ['custom-snackbar'];
const POSITIVE_PANEL_CLASS = ['custom-snackbar-positive'];

describe('SnackBarService', () => {
    let service: SnackBarService;
    let snackBarMock: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        snackBarMock = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            providers: [SnackBarService, { provide: MatSnackBar, useValue: snackBarMock }],
        });

        service = TestBed.inject(SnackBarService);
    });

    describe('Initialisation', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });
    });

    describe('showSnackBar()', () => {
        it('should open snackbar with standard styling', () => {
            const testMessage = 'Test message';

            service.showSnackBar(testMessage);

            expect(snackBarMock.open).toHaveBeenCalledWith(testMessage, 'Fermer', {
                duration: STANDARD_DURATION,
                panelClass: STANDARD_PANEL_CLASS,
            });
        });
    });

    describe('showSnackBarPositive()', () => {
        it('should open snackbar with positive styling', () => {
            const testMessage = 'Positive message';

            service.showSnackBarPositive(testMessage);

            expect(snackBarMock.open).toHaveBeenCalledWith(testMessage, 'Fermer', {
                duration: POSITIVE_DURATION,
                panelClass: POSITIVE_PANEL_CLASS,
            });
        });
    });

    describe('showTransitiveSnackBar()', () => {
        it('should open snackbar with transitive positive styling', () => {
            const testMessage = 'Transitive message';

            service.showTransitiveSnackBar(testMessage);

            expect(snackBarMock.open).toHaveBeenCalledWith(testMessage, 'Fermer', {
                duration: TRANSITIVE_DURATION,
                panelClass: POSITIVE_PANEL_CLASS,
            });
        });
    });
});
