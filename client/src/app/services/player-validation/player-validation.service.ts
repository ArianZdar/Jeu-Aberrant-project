import { Injectable } from '@angular/core';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { MAX_NAME_LENGTH, MIN_POWER } from '@app/constants/client-constants';

@Injectable({
    providedIn: 'root',
})
export class PlayerValidationService {
    constructor(private snackBarService: SnackBarService) {}

    validateName(name: string): boolean {
        if (!name) {
            this.snackBarService.showSnackBar('Veuillez entrer un nom.');
            return false;
        }
        if (name.length > MAX_NAME_LENGTH) {
            this.snackBarService.showSnackBar(`Votre nom peut avoir un maximum de ${MAX_NAME_LENGTH} caractères.`);
            return false;
        }
        return true;
    }

    validatePowers(healthPower: number, speedPower: number): boolean {
        if (healthPower === MIN_POWER && speedPower === MIN_POWER) {
            this.snackBarService.showSnackBar('Veuillez définir votre bonus de points pour la vie ou la vitesse.');
            return false;
        }
        return true;
    }

    validateDiceSelection(attackDice: number | null, defenseDice: number | null): boolean {
        if (!attackDice) {
            this.snackBarService.showSnackBar("Veuillez sélectionner un dé d'attaque.");
            return false;
        }

        if (!defenseDice) {
            this.snackBarService.showSnackBar('Veuillez sélectionner un dé de défense.');
            return false;
        }

        return true;
    }

    validateChampionSelection(championIndex: number | null): boolean {
        if (championIndex === null) {
            this.snackBarService.showSnackBar('Veuillez sélectionner un champion.');
            return false;
        }
        return true;
    }
}
