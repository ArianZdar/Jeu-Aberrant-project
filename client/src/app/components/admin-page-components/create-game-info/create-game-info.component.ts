import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DESCRIPTION_MAX_LENGTH, TITLE_MAX_LENGTH } from '@app/constants/client-constants';
import { FormDataService } from '@app/services/form-data/form-data.service';

interface Option {
    display: string;
    value: number;
}

@Component({
    selector: 'app-create-game-info',
    templateUrl: './create-game-info.component.html',
    styleUrls: ['./create-game-info.component.scss'],
    imports: [FormsModule, CommonModule],
})
export class CreateGameInfoComponent {
    @Input() isVisible: boolean = true;
    @Output() visibilityChange = new EventEmitter<boolean>();
    readonly titleMaxLength = TITLE_MAX_LENGTH;
    readonly descriptionMaxLength = DESCRIPTION_MAX_LENGTH;
    name: string = '';
    description: string = '';
    error: string = '';
    isFormValid = false;
    selectedModeOption: string;
    isDropdownModeOpen: boolean = false;
    modeOptions: string[] = ['Capture the Flag', 'Classique'];
    selectedSizeOption: Option | undefined;
    isDropdownSizeOpen: boolean = false;
    sizeOptions: Option[] = [
        { display: 'Petit (10x10)', value: 10 },
        { display: 'Moyen (15x15)', value: 15 },
        { display: 'Grand(20x20)', value: 20 },
    ];

    constructor(
        private formDataService: FormDataService,
        private router: Router,
    ) {}

    toggleDropdownMode() {
        this.isDropdownModeOpen = !this.isDropdownModeOpen;
        if (this.isDropdownModeOpen) {
            this.isDropdownSizeOpen = false;
        }
    }

    selectModeOption(option: string) {
        this.selectedModeOption = option;
        this.isDropdownModeOpen = false;
    }

    toggleDropdownSize() {
        this.isDropdownSizeOpen = !this.isDropdownSizeOpen;
        if (this.isDropdownSizeOpen) {
            this.isDropdownModeOpen = false;
        }
    }

    selectSizeOption(option: Option) {
        this.selectedSizeOption = option;
        this.isDropdownSizeOpen = false;
    }

    onSubmit() {
        this.formDataService.resetFormData();

        this.error = '';
        this.isFormValid = false;

        if (this.description === '') {
            this.error = 'Une description est requise';
            return;
        }
        if (this.selectedSizeOption === undefined) {
            this.error = 'Une taille est requise';
            return;
        }
        if (this.selectedModeOption === undefined) {
            this.error = 'Un mode est requis';
            return;
        }
        if (this.name === '') {
            this.error = 'Un nom est requis';
            return;
        }

        this.isFormValid = true;
        this.error = '';
        this.formDataService.setFormData({
            name: this.name,
            description: this.description,
            size: this.selectedSizeOption.value,
            mode: this.selectedModeOption,
        });
        this.formDataService.isModifyingAGame(false, '-1');
        this.close();
        this.router.navigate(['/editorview']);
    }

    close() {
        this.name = '';
        this.description = '';
        this.selectedModeOption = '';
        this.isDropdownModeOpen = false;
        this.isDropdownSizeOpen = false;
        this.isVisible = false;
        this.visibilityChange.emit(this.isVisible);
    }
}
