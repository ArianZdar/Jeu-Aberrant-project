import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { PlayerManagerService } from './player-manager.service';
import { ChampSelectService } from '@app/services/sockets/champ-select/champ-select.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { DICE_4, MIN_POWER, MAX_POWER } from '@app/constants/client-constants';
import { PlayerInfo } from '@common/player/player-info';
import { of } from 'rxjs';
import { LockedLobbyPopupComponent } from '@app/components/champion-selection-page-components/locked-lobby-popup/locked-lobby-popup.component';

const DICE_6 = 6;

describe('PlayerManagerService', () => {
    let service: PlayerManagerService;
    let mockChampSelect: jasmine.SpyObj<ChampSelectService>;
    let mockDialog: jasmine.SpyObj<MatDialog>;
    let mockSnackBar: jasmine.SpyObj<SnackBarService>;

    beforeEach(() => {
        mockChampSelect = jasmine.createSpyObj('ChampSelectService', ['isRoomFull', 'isRoomLocked', 'submitChampSelect']);
        mockDialog = jasmine.createSpyObj('MatDialog', ['open']);
        mockSnackBar = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);

        TestBed.configureTestingModule({
            providers: [
                PlayerManagerService,
                { provide: ChampSelectService, useValue: mockChampSelect },
                { provide: MatDialog, useValue: mockDialog },
                { provide: SnackBarService, useValue: mockSnackBar },
            ],
        });

        service = TestBed.inject(PlayerManagerService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('createPlayerInfo', () => {
        it('should create PlayerInfo with max health and min speed when healthPower is MAX_POWER', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.healthPower).toBe(MAX_POWER);
            expect(result.speed).toBe(MIN_POWER);
            expect(result.attackPower).toBe(MIN_POWER);
            expect(result.defensePower).toBe(MAX_POWER);
        });

        it('should create PlayerInfo with min attack and max defense when attackDice is DICE_4', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.attackPower).toBe(MIN_POWER);
            expect(result.defensePower).toBe(MAX_POWER);
        });

        it('should create PlayerInfo with max attack and min defense when attackDice is not DICE_4', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_6,
                defenseDice: DICE_4,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.attackPower).toBe(MAX_POWER);
            expect(result.defensePower).toBe(MIN_POWER);
        });

        it('should set all player state properties correctly', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 2, attributes);

            expect(result._id).toBe('player1');
            expect(result.name).toBe('TestPlayer');
            expect(result.championIndex).toBe(2);
            expect(result.isReady).toBeFalse();
            expect(result.isAlive).toBeTrue();
            expect(result.isWinner).toBeFalse();
            expect(result.isDisconnected).toBeFalse();
            expect(result.isBot).toBeFalse();
            expect(result.isLeader).toBeFalse();
        });

        it('should set healthPower to MIN_POWER when healthPower is not MAX_POWER', () => {
            const attributes = {
                healthPower: MIN_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.healthPower).toBe(MIN_POWER);
        });

        it('should set speedPower to MAX_POWER when healthPower is MIN_POWER', () => {
            const attributes = {
                healthPower: MIN_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: DICE_6,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.speed).toBe(MAX_POWER);
        });

        it('should set defensePower to MIN_POWER when attackDice is not DICE_4', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_6,
                defenseDice: DICE_4,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.defensePower).toBe(MIN_POWER);
        });

        it('should set defensePower to MIN_POWER when attackDice is DICE_4 and defenseDice is not DICE_6', () => {
            const attributes = {
                healthPower: MAX_POWER,
                speedPower: MIN_POWER,
                attackDice: DICE_4,
                defenseDice: 8,
            };

            const result = service.createPlayerInfo('player1', 'TestPlayer', 0, attributes);

            expect(result.defensePower).toBe(MIN_POWER);
        });
    });

    describe('submitPlayer', () => {
        let mockPlayerInfo: PlayerInfo;

        beforeEach(() => {
            mockPlayerInfo = {
                _id: 'player1',
                name: 'TestPlayer',
                championIndex: 0,
                healthPower: MAX_POWER,
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
        });

        it('should show snackbar and return false when room is full', async () => {
            mockChampSelect.isRoomFull.and.resolveTo(true);

            const result = await service.submitPlayer(mockPlayerInfo);

            expect(mockSnackBar.showSnackBar).toHaveBeenCalledWith('La partie est pleine.');
            expect(result).toBeFalse();
            expect(mockChampSelect.submitChampSelect).not.toHaveBeenCalled();
        });

        it('should open dialog and return false when room is locked', async () => {
            mockChampSelect.isRoomFull.and.resolveTo(false);
            mockChampSelect.isRoomLocked.and.resolveTo(true);

            const mockDialogRef = {
                afterClosed: () => of(null),
            };
            mockDialog.open.and.returnValue(mockDialogRef as MatDialogRef<unknown>);

            const result = await service.submitPlayer(mockPlayerInfo);

            expect(mockDialog.open).toHaveBeenCalledWith(LockedLobbyPopupComponent, {
                width: '30vh',
                disableClose: true,
            });
            expect(result).toBeFalse();
            expect(mockChampSelect.submitChampSelect).not.toHaveBeenCalled();
        });

        it('should retry submitting player when locked room dialog returns "retry"', fakeAsync(() => {
            mockChampSelect.isRoomFull.and.resolveTo(false);
            mockChampSelect.isRoomLocked.and.resolveTo(true);

            const mockDialogRef = {
                afterClosed: () => of('retry'),
            };
            mockDialog.open.and.returnValue(mockDialogRef as MatDialogRef<unknown>);

            service.submitPlayer(mockPlayerInfo);

            tick();

            expect(mockDialog.open).toHaveBeenCalled();

            tick();

            expect(mockChampSelect.submitChampSelect).toHaveBeenCalledWith(mockPlayerInfo);
        }));

        it('should submit player info and return true when room is available', async () => {
            mockChampSelect.isRoomFull.and.resolveTo(false);
            mockChampSelect.isRoomLocked.and.resolveTo(false);

            const result = await service.submitPlayer(mockPlayerInfo);

            expect(mockChampSelect.submitChampSelect).toHaveBeenCalledWith(mockPlayerInfo);
            expect(result).toBeTrue();
        });
    });
});
