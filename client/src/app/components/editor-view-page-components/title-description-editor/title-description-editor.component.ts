import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '@app/constants/client-constants';

@Component({
    selector: 'app-title-description-editor',
    imports: [CommonModule, FormsModule],
    templateUrl: './title-description-editor.component.html',
    styleUrls: ['./title-description-editor.component.scss'],
})
export class TitleDescriptionEditorComponent {
    @Input() title: string = '';
    @Input() description: string = '';

    @Output() titleChange = new EventEmitter<string>();
    @Output() descriptionChange = new EventEmitter<string>();

    readonly titleMaxLength = TITLE_MAX_LENGTH;
    readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;

    onTitleChange(newTitle: string): void {
        this.titleChange.emit(newTitle);
    }

    onDescriptionChange(newDescription: string): void {
        this.descriptionChange.emit(newDescription);
    }
}
