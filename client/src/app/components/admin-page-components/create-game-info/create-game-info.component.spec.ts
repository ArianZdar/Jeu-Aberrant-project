import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { CreateGameInfoComponent } from './create-game-info.component';
import { Router } from '@angular/router';

interface Option {
    display: string;
    value: number;
}

describe('CreateGameInfoComponent', () => {
    let component: CreateGameInfoComponent;
    let fixture: ComponentFixture<CreateGameInfoComponent>;
    let formDataService: jasmine.SpyObj<FormDataService>;
    let router: jasmine.SpyObj<Router>;

    beforeEach(async () => {
        formDataService = jasmine.createSpyObj('FormDataService', ['resetFormData', 'setFormData', 'isModifyingAGame']);
        router = jasmine.createSpyObj('Router', ['navigate']);

        await TestBed.configureTestingModule({
            imports: [CreateGameInfoComponent],
            providers: [
                { provide: FormDataService, useValue: formDataService },
                { provide: Router, useValue: router },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(CreateGameInfoComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('Dropdown Controls', () => {
        it('toggleDropdownMode should toggle mode dropdown', () => {
            component.toggleDropdownMode();
            expect(component.isDropdownModeOpen).toBeTrue();
            expect(component.isDropdownSizeOpen).toBeFalse();
        });

        it('selectModeOption should set mode and close dropdown', () => {
            const option = 'Capture the Flag';
            component.selectModeOption(option);
            expect(component.selectedModeOption).toBe(option);
            expect(component.isDropdownModeOpen).toBeFalse();
        });

        describe('toggleDropdownSize()', () => {
            it('should toggle isDropdownSizeOpen from false to true', () => {
                component.isDropdownSizeOpen = false;
                component.toggleDropdownSize();
                expect(component.isDropdownSizeOpen).toBeTrue();
            });

            it('should toggle isDropdownSizeOpen from true to false', () => {
                component.isDropdownSizeOpen = true;
                component.toggleDropdownSize();
                expect(component.isDropdownSizeOpen).toBeFalse();
            });
        });

        it('selectSizeOption() should set size and close dropdown', () => {
            const mockOption: Option = { display: 'Petit (10x10)', value: 10 };

            component.selectSizeOption(mockOption);

            expect(component.selectedSizeOption?.display).toBe(mockOption.display);
            expect(component.selectedSizeOption?.value).toBe(mockOption.value);
            expect(component.isDropdownSizeOpen).toBeFalse();
        });
    });

    describe('Form Validation', () => {
        it('should show error for empty name', () => {
            component.description = 'test';
            component.selectedModeOption = 'Classique';
            component.selectedSizeOption = { display: 'Petit (10x10)', value: 10 };
            component.onSubmit();
            expect(component.error).toBe('Un nom est requis');
        });

        it('should show error for empty description', () => {
            component.name = 'test';
            component.selectedModeOption = 'Classique';
            component.selectedSizeOption = { display: 'Petit (10x10)', value: 10 };
            component.onSubmit();
            expect(component.error).toBe('Une description est requise');
        });

        it('should show error for no mode selected', () => {
            component.name = 'test';
            component.description = 'test';
            component.selectedSizeOption = { display: 'Petit (10x10)', value: 10 };
            component.onSubmit();
            expect(component.error).toBe('Un mode est requis');
        });

        it('should show error for no size selected', () => {
            component.name = 'test';
            component.description = 'test';
            component.selectedModeOption = 'Classique';
            component.onSubmit();
            expect(component.error).toBe('Une taille est requise');
        });
    });

    describe('Form Submission', () => {
        beforeEach(() => {
            component.error = '';
            component.isFormValid = true;
        });

        it('should submit form with selected size', () => {
            component.name = 'test';
            component.description = 'test';
            component.selectedModeOption = 'Classique';
            component.selectedSizeOption = { display: 'Petit (10x10)', value: 10 };

            component.onSubmit();

            expect(formDataService.setFormData).toHaveBeenCalledWith({
                name: 'test',
                description: 'test',
                mode: 'Classique',
                size: 10,
            });
            expect(router.navigate).toHaveBeenCalledWith(['/editorview']);
        });
    });

    describe('Size Option Handling', () => {
        beforeEach(() => {
            component.name = 'test';
            component.description = 'test';
            component.selectedModeOption = 'Classique';
        });

        it('should use size value when selectedSizeOption exists', () => {
            component.selectedSizeOption = { display: 'Petit (10x10)', value: 10 };
            component.onSubmit();
            expect(formDataService.setFormData).toHaveBeenCalledWith({
                name: 'test',
                description: 'test',
                mode: 'Classique',
                size: 10,
            });
            expect(formDataService.isModifyingAGame).toHaveBeenCalledWith(false, '-1');
            expect(router.navigate).toHaveBeenCalledWith(['/editorview']);
        });
    });

    describe('Component Closure', () => {
        it('should reset form and emit visibility change on close', () => {
            spyOn(component.visibilityChange, 'emit');
            component.close();
            expect(component.name).toBe('');
            expect(component.description).toBe('');
            expect(component.selectedModeOption).toBe('');
            expect(component.isDropdownModeOpen).toBeFalse();
            expect(component.isDropdownSizeOpen).toBeFalse();
            expect(component.isVisible).toBeFalse();
            expect(component.visibilityChange.emit).toHaveBeenCalledWith(false);
        });
    });
});
