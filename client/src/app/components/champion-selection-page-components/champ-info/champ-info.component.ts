import { Component, Input, ViewChild, ElementRef, inject, OnDestroy } from '@angular/core';
import { DiceChoiceComponent } from '@app/components/champion-selection-page-components/dice-choice/dice-choice.component';
import { PowerBarComponent } from '@app/components/champion-selection-page-components/power-bar/power-bar.component';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { GameStatusValidationService } from '@app/services/game-status-validation/game-status-validation.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { ChampSelectService } from '@app/services/sockets/champ-select/champ-select.service';
import { PlayerManagerService } from '@app/services/player-manager/player-manager.service';
import { PlayerValidationService } from '@app/services/player-validation/player-validation.service';
import { DICE_4, DICE_6, MIN_POWER, MAX_POWER, PowerType } from '@app/constants/client-constants';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-champ-info',
    imports: [DiceChoiceComponent, PowerBarComponent],
    templateUrl: './champ-info.component.html',
    styleUrl: './champ-info.component.scss',
})
export class ChampInfoComponent implements OnDestroy {
    @Input() _id: string = '';
    @ViewChild('playerNameInput') playerNameInput!: ElementRef<HTMLInputElement>;

    selectedAttackDice: number | null = null;
    grayedOutDefenseDice: number | null = null;
    selectedDefenseDice: number | null = null;
    grayedOutAttackDice: number | null = null;
    healthPower: number = MIN_POWER;
    speedPower: number = MIN_POWER;
    name: string = '';

    protected powerType = PowerType;

    private champIsUnique: boolean = true;
    private errorSubscription: Subscription;
    private submittedSubscription: Subscription;

    private playerManagerService = inject(PlayerManagerService);
    constructor(
        private gameStatusValidationService: GameStatusValidationService,
        private snackBarService: SnackBarService,
        private champSelectService: ChampSelectService,
        private championIndexService: ChampionIndexService,
        private playerValidationService: PlayerValidationService,
    ) {
        this.errorSubscription = this.champSelectService.champSelectError.subscribe((error) => {
            this.snackBarService.showSnackBar(error.message);
            this.champIsUnique = false;
        });

        this.submittedSubscription = this.champSelectService.champSelectSubmitted.subscribe(() => {
            if (this.champIsUnique) {
                this.gameStatusValidationService.validation(this._id, 'champSelect');
            }
        });
    }

    ngOnDestroy(): void {
        if (this.errorSubscription) {
            this.errorSubscription.unsubscribe();
        }

        if (this.submittedSubscription) {
            this.submittedSubscription.unsubscribe();
        }
    }

    onAttackDiceSelected(dice: number): void {
        if (this.selectedAttackDice === dice) {
            this.selectedAttackDice = null;
            this.grayedOutDefenseDice = null;
        } else {
            this.selectedAttackDice = dice;
            this.grayedOutDefenseDice = dice;
            this.selectedDefenseDice = dice === DICE_4 ? DICE_6 : DICE_4;
            this.grayedOutAttackDice = this.selectedDefenseDice;
        }
    }

    onDefenseDiceSelected(dice: number): void {
        if (this.selectedDefenseDice === dice) {
            this.selectedDefenseDice = null;
            this.grayedOutAttackDice = null;
        } else {
            this.selectedDefenseDice = dice;
            this.grayedOutAttackDice = dice;
            this.selectedAttackDice = dice === DICE_4 ? DICE_6 : DICE_4;
            this.grayedOutDefenseDice = this.selectedAttackDice;
        }
    }

    onPowerChange(type: PowerType, power: number): void {
        if (type === PowerType.Health) {
            this.healthPower = power;
            if (power === MAX_POWER) {
                this.speedPower = MIN_POWER;
            }
        } else {
            this.speedPower = power;
            if (power === MAX_POWER) {
                this.healthPower = MIN_POWER;
            }
        }
    }

    async valid(): Promise<void> {
        this.champIsUnique = true;
        this.name = this.playerNameInput.nativeElement.value.trim();

        const isPlayerDataValid =
            this.playerValidationService.validateName(this.name) &&
            this.playerValidationService.validatePowers(this.healthPower, this.speedPower) &&
            this.playerValidationService.validateDiceSelection(this.selectedAttackDice, this.selectedDefenseDice) &&
            this.playerValidationService.validateChampionSelection(this.championIndexService.currentIndexSubject.value);

        if (!isPlayerDataValid) {
            return;
        }

        const playerAttributes = {
            healthPower: this.healthPower,
            speedPower: this.speedPower,
            attackDice: this.selectedAttackDice as number,
            defenseDice: this.selectedDefenseDice as number,
        };

        const playerInfo = this.playerManagerService.createPlayerInfo(
            this.champSelectService.lobbyService.getSocketId(),
            this.name,
            this.championIndexService.currentIndexSubject.value as number,
            playerAttributes,
        );

        await this.playerManagerService.submitPlayer(playerInfo);
    }
}
