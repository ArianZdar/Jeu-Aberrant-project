import { TestBed } from '@angular/core/testing';
import { PlayerValidationService } from './player-validation.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { MAX_NAME_LENGTH, MIN_POWER, DICE_4, DICE_6 } from '@app/constants/client-constants';

const VALID_CHAMPION_INDEX = 2;

describe('PlayerValidationService', () => {
    let service: PlayerValidationService;
    let mockSnackBar: jasmine.SpyObj<SnackBarService>;

    beforeEach(() => {
        mockSnackBar = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);

        TestBed.configureTestingModule({
            providers: [PlayerValidationService, { provide: SnackBarService, useValue: mockSnackBar }],
        });

        service = TestBed.inject(PlayerValidationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('validateName', () => {
        it('should return false when name is empty', () => {
            const result = service.validateName('');

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith('Veuillez entrer un nom.');
        });

        it('should return false when name is too long', () => {
            const longName = 'a'.repeat(MAX_NAME_LENGTH + 1);

            const result = service.validateName(longName);

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith(`Votre nom peut avoir un maximum de ${MAX_NAME_LENGTH} caractères.`);
        });

        it('should return true when name is valid', () => {
            const validName = 'ValidName';

            const result = service.validateName(validName);

            expect(result).toBeTrue();
            expect(mockSnackBar.showSnackBar).not.toHaveBeenCalled();
        });
    });

    describe('validatePowers', () => {
        it('should return false when both health and speed are MIN_POWER', () => {
            const result = service.validatePowers(MIN_POWER, MIN_POWER);

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith('Veuillez définir votre bonus de points pour la vie ou la vitesse.');
        });

        it('should return true when at least one power is not MIN_POWER', () => {
            let result = service.validatePowers(MIN_POWER + 1, MIN_POWER);
            expect(result).toBeTrue();

            result = service.validatePowers(MIN_POWER, MIN_POWER + 1);
            expect(result).toBeTrue();

            result = service.validatePowers(MIN_POWER + 1, MIN_POWER + 1);
            expect(result).toBeTrue();

            expect(mockSnackBar.showSnackBar).not.toHaveBeenCalled();
        });
    });

    describe('validateDiceSelection', () => {
        it('should return false when attackDice is null', () => {
            const result = service.validateDiceSelection(null, DICE_6);

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith("Veuillez sélectionner un dé d'attaque.");
        });

        it('should return false when defenseDice is null', () => {
            mockSnackBar.showSnackBar.calls.reset();

            const result = service.validateDiceSelection(DICE_4, null);

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith('Veuillez sélectionner un dé de défense.');
        });

        it('should return true when both dice are selected', () => {
            const result = service.validateDiceSelection(DICE_4, DICE_6);

            expect(result).toBeTrue();
            expect(mockSnackBar.showSnackBar).not.toHaveBeenCalled();
        });
    });

    describe('validateChampionSelection', () => {
        it('should return false when championIndex is null', () => {
            const result = service.validateChampionSelection(null);

            expect(result).toBeFalse();
            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith('Veuillez sélectionner un champion.');
        });

        it('should return true when championIndex is not null', () => {
            const result = service.validateChampionSelection(VALID_CHAMPION_INDEX);

            expect(result).toBeTrue();
            expect(mockSnackBar.showSnackBar).not.toHaveBeenCalled();
        });
    });
});
