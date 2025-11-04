import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TitleDescriptionEditorComponent } from './title-description-editor.component';
import { By } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

describe('TitleDescriptionEditorComponent', () => {
    let component: TitleDescriptionEditorComponent;
    let fixture: ComponentFixture<TitleDescriptionEditorComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TitleDescriptionEditorComponent, FormsModule],
        }).compileComponents();

        fixture = TestBed.createComponent(TitleDescriptionEditorComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('onTitleChange', () => {
        it('should emit titleChange event with new title value', () => {
            const newTitle = 'Emitted Title Value';
            spyOn(component.titleChange, 'emit');

            component.onTitleChange(newTitle);

            expect(component.titleChange.emit).toHaveBeenCalledWith(newTitle);
        });

        it('should handle ngModelChange for title input', () => {
            const newTitle = 'New Title from NgModel';
            spyOn(component, 'onTitleChange').and.callThrough();
            spyOn(component.titleChange, 'emit');

            component.title = newTitle;
            const titleInput = fixture.debugElement.query(By.css('#title-input'));
            titleInput.triggerEventHandler('ngModelChange', newTitle);
            fixture.detectChanges();

            expect(component.onTitleChange).toHaveBeenCalledWith(newTitle);
            expect(component.titleChange.emit).toHaveBeenCalledWith(newTitle);
        });
    });

    describe('onDescriptionChange', () => {
        it('should emit descriptionChange event with new description value', () => {
            const newDescription = 'Emitted description value';
            spyOn(component.descriptionChange, 'emit');

            component.onDescriptionChange(newDescription);

            expect(component.descriptionChange.emit).toHaveBeenCalledWith(newDescription);
        });

        it('should handle ngModelChange for description input', () => {
            const newDescription = 'New Description from NgModel';
            spyOn(component, 'onDescriptionChange').and.callThrough();
            spyOn(component.descriptionChange, 'emit');

            component.description = newDescription;
            const descriptionInput = fixture.debugElement.query(By.css('#description-input'));
            descriptionInput.triggerEventHandler('ngModelChange', newDescription);
            fixture.detectChanges();

            expect(component.onDescriptionChange).toHaveBeenCalledWith(newDescription);
            expect(component.descriptionChange.emit).toHaveBeenCalledWith(newDescription);
        });
    });

    describe('Input validation and boundaries', () => {
        it('should respect title max length', () => {
            const titleInput = fixture.debugElement.query(By.css('#title-input')).nativeElement;
            expect(titleInput.getAttribute('maxlength')).toBe(component.titleMaxLength.toString());
        });

        it('should respect description max length', () => {
            const descriptionInput = fixture.debugElement.query(By.css('#description-input')).nativeElement;
            expect(descriptionInput.getAttribute('maxlength')).toBe(component.descriptionMaxLength.toString());
        });
    });

    describe('Two-way data binding with NgModel', () => {
        it('should update the component property when title changes in the view', () => {
            const newTitle = 'New Title From View';
            const titleInput = fixture.debugElement.query(By.css('#title-input')).nativeElement;

            titleInput.value = newTitle;
            titleInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(component.title).toBe(newTitle);
        });

        it('should update the component property when description changes in the view', () => {
            const newDescription = 'New Description From View';
            const descriptionInput = fixture.debugElement.query(By.css('#description-input')).nativeElement;

            descriptionInput.value = newDescription;
            descriptionInput.dispatchEvent(new Event('input'));
            fixture.detectChanges();

            expect(component.description).toBe(newDescription);
        });
    });
});
