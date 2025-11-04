import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { DeleteGameDialogComponent } from './delete-game-dialog.component';

describe('DeleteGameDialogComponent', () => {
    let component: DeleteGameDialogComponent;
    let fixture: ComponentFixture<DeleteGameDialogComponent>;
    let dialogRefSpy: { close: jasmine.Spy };

    beforeEach(async () => {
        dialogRefSpy = { close: jasmine.createSpy('close') };

        await TestBed.configureTestingModule({
            imports: [DeleteGameDialogComponent],
            providers: [
                {
                    provide: MatDialogRef,
                    useValue: dialogRefSpy,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(DeleteGameDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('onConfirm() should close the dialog with true', () => {
        component.onConfirm();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
    });

    it('onCancel() should close the dialog with false', () => {
        component.onCancel();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(false);
    });
});
