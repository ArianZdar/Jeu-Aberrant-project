/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChampInfoComponent } from './champ-info.component';
import { DiceChoiceComponent } from '@app/components/champion-selection-page-components/dice-choice/dice-choice.component';
import { PowerBarComponent } from '@app/components/champion-selection-page-components/power-bar/power-bar.component';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { GameStatusValidationService } from '@app/services/game-status-validation/game-status-validation.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { ChampSelectService } from '@app/services/sockets/champ-select/champ-select.service';
import { PlayerManagerService } from '@app/services/player-manager/player-manager.service';
import { PlayerValidationService } from '@app/services/player-validation/player-validation.service';
import { BehaviorSubject, Subject } from 'rxjs';
import { DICE_4, DICE_6, MIN_POWER, MAX_POWER, PowerType } from '@app/constants/client-constants';
import { ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';

describe('ChampInfoComponent', () => {
    let component: ChampInfoComponent;
    let fixture: ComponentFixture<ChampInfoComponent>;
    let mockChampSelectService: jasmine.SpyObj<ChampSelectService>;
    let mockSnackBarService: jasmine.SpyObj<SnackBarService>;
    let mockGameStatusValidationService: jasmine.SpyObj<GameStatusValidationService>;
    let mockPlayerManagerService: jasmine.SpyObj<PlayerManagerService>;
    let mockPlayerValidationService: jasmine.SpyObj<PlayerValidationService>;
    let mockChampionIndexService: jasmine.SpyObj<ChampionIndexService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let errorSubject: Subject<{ message: string }>;
    let submittedSubject: Subject<void>;
    let indexSubject: BehaviorSubject<number | null>;

    beforeEach(async () => {
        errorSubject = new Subject<{ message: string }>();
        submittedSubject = new Subject<void>();
        indexSubject = new BehaviorSubject<number | null>(1);

        mockChampSelectService = jasmine.createSpyObj('ChampSelectService', ['submitChampSelect', 'isRoomFull', 'isRoomLocked']);
        mockSnackBarService = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);
        mockGameStatusValidationService = jasmine.createSpyObj('GameStatusValidationService', ['validation']);
        mockPlayerManagerService = jasmine.createSpyObj('PlayerManagerService', ['createPlayerInfo', 'submitPlayer']);
        mockPlayerValidationService = jasmine.createSpyObj('PlayerValidationService', [
            'validateName',
            'validatePowers',
            'validateDiceSelection',
            'validateChampionSelection',
        ]);
        mockChampionIndexService = jasmine.createSpyObj('ChampionIndexService', ['setCurrentIndex']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);

        Object.defineProperty(mockChampSelectService, 'champSelectError', {
            get: () => errorSubject.asObservable(),
        });

        Object.defineProperty(mockChampSelectService, 'champSelectSubmitted', {
            get: () => submittedSubject.asObservable(),
        });

        Object.defineProperty(mockChampionIndexService, 'currentIndexSubject', {
            get: () => ({ value: indexSubject.getValue() }),
            set(value) {
                indexSubject.next(value);
            },
        });

        mockChampSelectService.lobbyService = {
            getSocketId: () => 'socket-id',
        } as LobbyService;

        await TestBed.configureTestingModule({
            imports: [ChampInfoComponent, DiceChoiceComponent, PowerBarComponent],
            providers: [
                { provide: ChampSelectService, useValue: mockChampSelectService },
                { provide: SnackBarService, useValue: mockSnackBarService },
                { provide: GameStatusValidationService, useValue: mockGameStatusValidationService },
                { provide: PlayerManagerService, useValue: mockPlayerManagerService },
                { provide: PlayerValidationService, useValue: mockPlayerValidationService },
                { provide: ChampionIndexService, useValue: mockChampionIndexService },
                { provide: MatDialog, useValue: mockDialog },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChampInfoComponent);
        component = fixture.componentInstance;

        component.playerNameInput = {
            nativeElement: { value: 'Test Player' },
        } as ElementRef<HTMLInputElement>;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with default values', () => {
        expect(component.selectedAttackDice).toBeNull();
        expect(component.selectedDefenseDice).toBeNull();
        expect(component.healthPower).toBe(MIN_POWER);
        expect(component.speedPower).toBe(MIN_POWER);
        expect((component as any).champIsUnique).toBeTrue();
    });

    it('should handle attack dice selection', () => {
        component.onAttackDiceSelected(DICE_4);
        expect(component.selectedAttackDice).toBe(DICE_4);
        expect(component.grayedOutDefenseDice).toBe(DICE_4);
        expect(component.selectedDefenseDice).toBe(DICE_6);
        expect(component.grayedOutAttackDice).toBe(DICE_6);

        component.onAttackDiceSelected(DICE_4);
        expect(component.selectedAttackDice).toBeNull();
        expect(component.grayedOutDefenseDice).toBeNull();
    });

    it('should handle defense dice selection', () => {
        component.onDefenseDiceSelected(DICE_6);
        expect(component.selectedDefenseDice).toBe(DICE_6);
        expect(component.grayedOutAttackDice).toBe(DICE_6);
        expect(component.selectedAttackDice).toBe(DICE_4);
        expect(component.grayedOutDefenseDice).toBe(DICE_4);

        component.onDefenseDiceSelected(DICE_6);
        expect(component.selectedDefenseDice).toBeNull();
        expect(component.grayedOutAttackDice).toBeNull();
    });

    it('should automatically select corresponding defense dice when attack dice is chosen', () => {
        component.onAttackDiceSelected(DICE_4);
        expect(component.selectedDefenseDice).toBe(DICE_6);

        component.onAttackDiceSelected(DICE_6);
        expect(component.selectedDefenseDice).toBe(DICE_4);
    });

    it('should automatically select corresponding attack dice when defense dice is chosen', () => {
        component.onDefenseDiceSelected(DICE_6);
        expect(component.selectedAttackDice).toBe(DICE_4);

        component.onDefenseDiceSelected(DICE_4);
        expect(component.selectedAttackDice).toBe(DICE_6);
    });

    it('should handle power change for health', () => {
        component.onPowerChange(PowerType.Health, MAX_POWER);
        expect(component.healthPower).toBe(MAX_POWER);
        expect(component.speedPower).toBe(MIN_POWER);
    });

    it('should handle power change for speed', () => {
        component.onPowerChange(PowerType.Speed, MAX_POWER);
        expect(component.speedPower).toBe(MAX_POWER);
        expect(component.healthPower).toBe(MIN_POWER);
    });

    it('should validate and submit player info', async () => {
        const mockPlayerInfo = {
            _id: 'socket-id',
            name: 'Test Player',
            championIndex: 1,
            healthPower: MAX_POWER,
            speedPower: MIN_POWER,
            attackPower: MIN_POWER,
            defensePower: MAX_POWER,
            speed: MIN_POWER,
            isReady: false,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
            isLeader: false,
        };

        mockPlayerValidationService.validateName.and.returnValue(true);
        mockPlayerValidationService.validatePowers.and.returnValue(true);
        mockPlayerValidationService.validateDiceSelection.and.returnValue(true);
        mockPlayerValidationService.validateChampionSelection.and.returnValue(true);
        mockPlayerManagerService.createPlayerInfo.and.returnValue(mockPlayerInfo);
        mockPlayerManagerService.submitPlayer.and.resolveTo(true);

        component.healthPower = MAX_POWER;
        component.speedPower = MIN_POWER;
        component.selectedAttackDice = DICE_4;
        component.selectedDefenseDice = DICE_6;

        component.name = 'Test Player';
        component.playerNameInput.nativeElement.value = 'Test Player';

        await component.valid();

        expect(mockPlayerManagerService.createPlayerInfo).toHaveBeenCalledWith(
            'socket-id',
            'Test Player',
            1,
            jasmine.objectContaining({
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            }),
        );
        expect(mockPlayerManagerService.submitPlayer).toHaveBeenCalledWith(mockPlayerInfo);
    });

    it('should not submit player info if validation fails', async () => {
        mockPlayerValidationService.validateName.and.returnValue(false);

        await component.valid();

        expect(mockPlayerManagerService.submitPlayer).not.toHaveBeenCalled();
    });

    it('should handle champ select error', () => {
        const errorMessage = 'Test Error';
        errorSubject.next({ message: errorMessage });

        expect(mockSnackBarService.showSnackBar).toHaveBeenCalledWith(errorMessage);
        expect((component as any).champIsUnique).toBeFalse();
    });

    it('should handle champ select submission', () => {
        component._id = 'test-id';
        (component as any).champIsUnique = true;

        submittedSubject.next();

        expect(mockGameStatusValidationService.validation).toHaveBeenCalledWith('test-id', 'champSelect');
    });

    it('should call submitPlayer with correct parameters when room is locked', async () => {
        mockPlayerValidationService.validateName.and.returnValue(true);
        mockPlayerValidationService.validatePowers.and.returnValue(true);
        mockPlayerValidationService.validateDiceSelection.and.returnValue(true);
        mockPlayerValidationService.validateChampionSelection.and.returnValue(true);

        component.name = 'Test Player';
        component.playerNameInput.nativeElement.value = 'Test Player';

        component.healthPower = MAX_POWER;
        component.speedPower = MIN_POWER;
        component.selectedAttackDice = DICE_4;
        component.selectedDefenseDice = DICE_6;

        await component.valid();

        expect(mockPlayerManagerService.submitPlayer).toHaveBeenCalled();
    });

    it('should reset dice selections when same dice is selected again', () => {
        component.selectedAttackDice = DICE_4;
        component.grayedOutDefenseDice = DICE_4;
        component.onAttackDiceSelected(DICE_4);
        expect(component.selectedAttackDice).toBeNull();
        expect(component.grayedOutDefenseDice).toBeNull();

        component.selectedDefenseDice = DICE_6;
        component.grayedOutAttackDice = DICE_6;
        component.onDefenseDiceSelected(DICE_6);
        expect(component.selectedDefenseDice).toBeNull();
        expect(component.grayedOutAttackDice).toBeNull();
    });
});
