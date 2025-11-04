import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { getFakeGameInfo } from '@app/constants/mocks';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { GameInfo } from '@common/game/game-info';
import { of, throwError } from 'rxjs';
import { GamePreviewComponent } from './game-preview.component';

describe('GamePreviewComponent', () => {
    let component: GamePreviewComponent;
    let fixture: ComponentFixture<GamePreviewComponent>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockFormDataService: jasmine.SpyObj<FormDataService>;
    let mockGameService: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockFormDataService = jasmine.createSpyObj('FormDataService', ['isModifyingAGame']);
        mockGameService = jasmine.createSpyObj('GameService', ['getGameById']);

        await TestBed.configureTestingModule({
            imports: [GamePreviewComponent],
            providers: [
                provideHttpClient(),
                { provide: Router, useValue: mockRouter },
                { provide: FormDataService, useValue: mockFormDataService },
                { provide: GameService, useValue: mockGameService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GamePreviewComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('toggleHidden() should toggle isHidden and update currentEyeButtonImage', () => {
        spyOn(component.toggleHidden, 'emit');

        const initialIsHidden = component.isHidden;
        const initialEyeButtonImage = component.currentEyeButtonImage;

        component.onToggleHidden();

        expect(component.isHidden).toBe(!initialIsHidden);
        expect(component.currentEyeButtonImage).not.toBe(initialEyeButtonImage);
        expect(component.toggleHidden.emit).toHaveBeenCalled();
    });

    it('onMouseEnterEyeButton() should update currentEyeButtonImage', () => {
        component.onMouseEnterEyeButton();

        expect(component.currentEyeButtonImage).toBe(component.eyeButtonHoverImage);
    });

    it('onMouseLeaveEyeButton() should update currentEyeButtonImage', () => {
        component.onMouseLeaveEyeButton();

        expect(component.currentEyeButtonImage).toBe(component.eyeButtonImage);
    });

    it('should display the correct eye button image based on isHidden', () => {
        component.isHidden = true;
        fixture.detectChanges();
        expect(component.eyeButtonImage).toBe('assets/nEye.png');

        component.isHidden = false;
        fixture.detectChanges();
        expect(component.eyeButtonImage).toBe('assets/eye.png');
    });

    it('should display the correct eye button hover image based on isHidden', () => {
        component.isHidden = true;
        fixture.detectChanges();
        expect(component.eyeButtonHoverImage).toBe('assets/nEye-hover.png');

        component.isHidden = false;
        fixture.detectChanges();
        expect(component.eyeButtonHoverImage).toBe('assets/eye-hover.png');
    });

    it('delete() should emit delete event', () => {
        spyOn(component.delete, 'emit');

        component.onDelete();

        expect(component.delete.emit).toHaveBeenCalled();
    });

    it('should display the correct inverse button hover image based on currentEyeButtonImage', () => {
        component.currentEyeButtonImage = 'assets/nEye-hover.png';
        fixture.detectChanges();
        expect(component.inverseButtonHoverImage).toBe('assets/eye-hover.png');

        component.currentEyeButtonImage = 'assets/eye-hover.png';
        fixture.detectChanges();
        expect(component.inverseButtonHoverImage).toBe('assets/nEye-hover.png');
    });

    it('should display the correct thing based on small', () => {
        component.size = 'small';
        fixture.detectChanges();
        expect(component.getSizeDisplay()).toBe('Petit (10x10)');
    });

    it('should display the correct thing based on medium', () => {
        component.size = 'medium';
        fixture.detectChanges();
        expect(component.getSizeDisplay()).toBe('Moyen (15x15)');
    });

    it('should display the correct thing based on large', () => {
        component.size = 'large';
        fixture.detectChanges();
        expect(component.getSizeDisplay()).toBe('Large (20x20)');
    });

    it('getDateDisplay() should return formatted date and time for string date', () => {
        const dateString = '2023-10-10T14:30:00';
        component.lastModified = dateString;
        fixture.detectChanges();

        const expectedDateDisplay = '10 octobre 2023, 14 h 30';
        expect(component.getDateDisplay()).toBe(expectedDateDisplay);
    });

    it('onEdit() should navigate to editor view if game exists and emit delete if there is an error or if the game does not exist', () => {
        spyOn(component.delete, 'emit');
        const validGame: GameInfo = getFakeGameInfo();

        mockGameService.getGameById.and.returnValue(of(validGame));
        component.onEdit();
        expect(mockGameService.getGameById).toHaveBeenCalledWith(component._id);
        expect(mockFormDataService.isModifyingAGame).toHaveBeenCalledWith(true, component._id);
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/editorview']);
        expect(component.delete.emit).not.toHaveBeenCalled();

        mockGameService.getGameById.and.returnValue(throwError(() => new Error('Error')));
        component.onEdit();
        expect(component.delete.emit).toHaveBeenCalled();
    });
});
