import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { SaveLevelDialogComponent } from './save-level-dialog.component';

describe('SaveLevelDialogComponent', () => {
    let component: SaveLevelDialogComponent;
    let fixture: ComponentFixture<SaveLevelDialogComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<SaveLevelDialogComponent>>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [MatDialogModule, SaveLevelDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: Router, useValue: routerSpy },
            ],
            schemas: [NO_ERRORS_SCHEMA],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(SaveLevelDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog and navigate on confirm', () => {
        component.onConfirm();
        expect(dialogRefSpy.close).toHaveBeenCalledWith(true);
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin']);
    });
});
