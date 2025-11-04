import { Injectable } from '@angular/core';

export interface GameFormData {
    name: string;
    description: string;
    size: number;
    mode: string;
}

@Injectable({
    providedIn: 'root',
})
export class FormDataService {
    private booleanIsNewGame = true;
    private _id: string = '';
    private formWasFilled = false;

    private formData: GameFormData = {
        name: '',
        description: '',
        size: 10,
        mode: 'Classique',
    };

    isModifyingAGame(isExistingGame: boolean, id: string): void {
        this._id = id;
        this.booleanIsNewGame = !isExistingGame;
        this.formWasFilled = true;
    }

    setFormData(data: GameFormData): void {
        this.formData = {
            name: data.name,
            description: data.description,
            size: data.size,
            mode: data.mode,
        };
        this.formWasFilled = true;
    }

    getFormData(): GameFormData {
        return this.formData;
    }

    getIsNewGame(): boolean {
        return this.booleanIsNewGame;
    }

    getId(): string {
        this.formWasFilled = false;
        return !this.booleanIsNewGame && this._id !== '' ? this._id : '-1';
    }

    resetFormData(): void {
        this.formData = {
            name: '',
            description: '',
            size: 10,
            mode: 'Classique',
        };
        this._id = '-1';
        this.booleanIsNewGame = true;
    }

    getFormWasFilled(): boolean {
        return this.formWasFilled;
    }
}
