import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogRef } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { LockedLobbyPopupComponent } from './locked-lobby-popup.component';

describe('LockedLobbyPopupComponent', () => {
    let component: LockedLobbyPopupComponent;
    let fixture: ComponentFixture<LockedLobbyPopupComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<LockedLobbyPopupComponent>>;
    let routerSpy: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);
        routerSpy = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [LockedLobbyPopupComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: Router, useValue: routerSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(LockedLobbyPopupComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should close dialog with "retry" when onRetry is called', () => {
        component.onRetry();
        expect(dialogRefSpy.close).toHaveBeenCalledWith('retry');
    });

    it('should close dialog with "home" and navigate to home when onReturnHome is called', () => {
        component.onReturnHome();
        expect(dialogRefSpy.close).toHaveBeenCalledWith('home');
        expect(routerSpy.navigate).toHaveBeenCalledWith(['/']);
    });
});
