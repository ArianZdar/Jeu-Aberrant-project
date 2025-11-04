/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { CombatStateService } from './combat-state.service';
import { Player } from '@common/player/player';
import { mockPlayers } from '@common/player/mock-player';

describe('CombatStateService', () => {
    let service: CombatStateService;
    let mockPlayer: Player;
    let mockOpponent: Player;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(CombatStateService);

        mockPlayer = { ...mockPlayers[0] };
        mockOpponent = { ...mockPlayers[1] };
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Player data methods', () => {
        it('should set main player infos', () => {
            service.setMainPlayerInfos(mockPlayer);
            expect(service.getMainPlayerInfos()).toEqual(mockPlayer);
        });

        it('should get opponent', () => {
            service.setOpponent(mockOpponent);
            expect(service.getOpponent()).toEqual(mockOpponent);
        });

        it('should set previousMainPlayerHealth to null if the player is null', () => {
            service.setMainPlayerInfos(null);
            expect(service['previousMainPlayerHealth']).toBeNull();
        });

        it('should set previousOpponentHealth to null if player is null', () => {
            service.setOpponent(null);
            expect(service['previousOpponentHealth']).toBeNull();
        });
    });

    describe('Animation states', () => {
        it('should set main player damaged state', () => {
            let damaged = false;
            service.mainPlayerDamaged$.subscribe((val) => (damaged = val));

            service.setMainPlayerDamaged(true);
            expect(damaged).toBeTrue();

            service.setMainPlayerDamaged(false);
            expect(damaged).toBeFalse();
        });

        it('should set opponent damaged state', () => {
            let damaged = false;
            service.opponentDamaged$.subscribe((val) => (damaged = val));

            service.setOpponentDamaged(true);
            expect(damaged).toBeTrue();

            service.setOpponentDamaged(false);
            expect(damaged).toBeFalse();
        });
    });

    describe('Combat values methods', () => {
        it('should set attack value', () => {
            let attackValue = 0;
            service.attackValue$.subscribe((val) => (attackValue = val));

            service.setAttackValue(15);
            expect(attackValue).toBe(15);
        });

        it('should set defense value', () => {
            let defenseValue = 0;
            service.defenseValue$.subscribe((val) => (defenseValue = val));

            service.setDefenseValue(10);
            expect(defenseValue).toBe(10);
        });

        it('should set show attack value flag', () => {
            let showValue = false;
            service.showAttackValue$.subscribe((val) => (showValue = val));

            service.setShowAttackValue(true);
            expect(showValue).toBeTrue();
        });

        it('should set show defense value flag', () => {
            let showValue = false;
            service.showDefenseValue$.subscribe((val) => (showValue = val));

            service.setShowDefenseValue(true);
            expect(showValue).toBeTrue();
        });

        it('should set attacker dice type', () => {
            let diceType = 0;
            service.attackerDiceType$.subscribe((val) => (diceType = val));

            service.setAttackerDiceType(6);
            expect(diceType).toBe(6);
        });

        it('should set defender dice type', () => {
            let diceType = 0;
            service.defenderDiceType$.subscribe((val) => (diceType = val));

            service.setDefenderDiceType(4);
            expect(diceType).toBe(4);
        });
    });

    describe('Combat state methods', () => {
        it('should set show victory message flag', () => {
            let showMessage = false;
            service.showVictoryMessage$.subscribe((val) => (showMessage = val));

            service.setShowVictoryMessage(true);
            expect(showMessage).toBeTrue();
        });

        it('should set is combat turn flag', () => {
            let isTurn = false;
            service.isCombatTurn$.subscribe((val) => (isTurn = val));

            service.setIsCombatTurn(true);
            expect(isTurn).toBeTrue();
        });

        it('should set escape failed flag', () => {
            let escapeFailed = false;
            service.escapeFailed$.subscribe((val) => (escapeFailed = val));

            service.setEscapeFailed(true);
            expect(escapeFailed).toBeTrue();
        });

        it('should set initial combat phase flag', () => {
            let isInitial = false;
            service.isInitialCombatPhase$.subscribe((val) => (isInitial = val));

            service.setIsInitialCombatPhase(true);
            expect(isInitial).toBeTrue();
        });

        it('should set is main player attacker flag', () => {
            let isAttacker = false;
            service.isMainPlayerAttacker$.subscribe((val) => (isAttacker = val));

            service.setIsMainPlayerAttacker(true);
            expect(isAttacker).toBeTrue();
        });
    });

    describe('resetCombatState method', () => {
        it('should reset all values to initial state', () => {
            service.setMainPlayerInfos(mockPlayer);
            service.setOpponent(mockOpponent);
            service.setMainPlayerDamaged(true);
            service.setOpponentDamaged(true);
            service.setAttackValue(15);
            service.setDefenseValue(10);
            service.setShowAttackValue(true);
            service.setShowDefenseValue(true);
            service.setWinnerName('Player 1');
            service.setShowVictoryMessage(true);
            service.setCombatTimerValue(30);
            service.setIsCombatTurn(true);
            service.setAttackerDiceType(6);
            service.setDefenderDiceType(4);
            service.setEscapeFailed(true);
            service.setCurrentTurnPlayerId('player123');
            service.setIsInitialCombatPhase(false);
            service.setIsMainPlayerAttacker(false);

            let mainPlayer: Player | null = mockPlayer;
            let opponent: Player | null = mockOpponent;
            let mainPlayerDamaged = true;
            let opponentDamaged = true;
            let attackValue = 15;
            let defenseValue = 10;
            let showAttack = true;
            let showDefense = true;
            let winnerName: string | null = 'Player 1';
            let showVictory = true;
            let timerValue: number | null = 30;
            let isCombatTurn = true;
            let attackerDiceType = 6;
            let defenderDiceType = 4;
            let escapeFailed = true;
            let currentTurnPlayerId: string | null = 'player123';
            let isInitialCombatPhase = false;
            let isMainPlayerAttacker = false;

            service.mainPlayerInfos$.subscribe((val) => (mainPlayer = val));
            service.opponent$.subscribe((val) => (opponent = val));
            service.mainPlayerDamaged$.subscribe((val) => (mainPlayerDamaged = val));
            service.opponentDamaged$.subscribe((val) => (opponentDamaged = val));
            service.attackValue$.subscribe((val) => (attackValue = val));
            service.defenseValue$.subscribe((val) => (defenseValue = val));
            service.showAttackValue$.subscribe((val) => (showAttack = val));
            service.showDefenseValue$.subscribe((val) => (showDefense = val));
            service.winnerName$.subscribe((val) => (winnerName = val));
            service.showVictoryMessage$.subscribe((val) => (showVictory = val));
            service.combatTimerValue$.subscribe((val) => (timerValue = val));
            service.isCombatTurn$.subscribe((val) => (isCombatTurn = val));
            service.attackerDiceType$.subscribe((val) => (attackerDiceType = val));
            service.defenderDiceType$.subscribe((val) => (defenderDiceType = val));
            service.escapeFailed$.subscribe((val) => (escapeFailed = val));
            service.currentTurnPlayerId$.subscribe((val) => (currentTurnPlayerId = val));
            service.isInitialCombatPhase$.subscribe((val) => (isInitialCombatPhase = val));
            service.isMainPlayerAttacker$.subscribe((val) => (isMainPlayerAttacker = val));

            expect(mainPlayer).toEqual(mockPlayer);
            expect(opponent).toEqual(mockOpponent);
            expect(mainPlayerDamaged).toBeTrue();

            service.resetCombatState();

            expect(mainPlayer).toBeNull();
            expect(opponent).toBeNull();
            expect(mainPlayerDamaged).toBeFalse();
            expect(opponentDamaged).toBeFalse();
            expect(attackValue).toBe(0);
            expect(defenseValue).toBe(0);
            expect(showAttack).toBeFalse();
            expect(showDefense).toBeFalse();
            expect(winnerName).toBeNull();
            expect(showVictory).toBeFalse();
            expect(timerValue).toBeNull();
            expect(isCombatTurn).toBeFalse();
            expect(attackerDiceType).toBe(0);
            expect(defenderDiceType).toBe(0);
            expect(escapeFailed).toBeFalse();
            expect(currentTurnPlayerId).toBeNull();
            expect(isInitialCombatPhase).toBeTrue();
            expect(isMainPlayerAttacker).toBeTrue();
            expect(service['previousMainPlayerHealth']).toBeNull();
            expect(service['previousOpponentHealth']).toBeNull();
        });
    });

    describe('Health tracking functionality', () => {
        it('should track main player health changes correctly', () => {
            service.setMainPlayerInfos(mockPlayer);
            expect(service['previousMainPlayerHealth']).toBe(mockPlayer.healthPower);

            let damaged = false;
            service.mainPlayerDamaged$.subscribe((val) => (damaged = val));
            service.setMainPlayerInfos({ ...mockPlayer });
            expect(damaged).toBeFalse();

            const damagedPlayer = { ...mockPlayer, healthPower: mockPlayer.healthPower - 5 };
            service.setMainPlayerInfos(damagedPlayer);
            expect(damaged).toBeTrue();
            expect(service['previousMainPlayerHealth']).toBe(damagedPlayer.healthPower);

            const healedPlayer = { ...mockPlayer, healthPower: mockPlayer.healthPower + 5 };
            service.setMainPlayerDamaged(false);
            damaged = false;
            service.setMainPlayerInfos(healedPlayer);
            expect(damaged).toBeFalse();
            expect(service['previousMainPlayerHealth']).toBe(healedPlayer.healthPower);
        });

        it('should track opponent health changes correctly', () => {
            service.setOpponent(mockOpponent);
            expect(service['previousOpponentHealth']).toBe(mockOpponent.healthPower);

            let damaged = false;
            service.opponentDamaged$.subscribe((val) => (damaged = val));
            service.setOpponent({ ...mockOpponent });
            expect(damaged).toBeFalse();

            const damagedOpponent = { ...mockOpponent, healthPower: mockOpponent.healthPower - 5 };
            service.setOpponent(damagedOpponent);
            expect(damaged).toBeTrue();
            expect(service['previousOpponentHealth']).toBe(damagedOpponent.healthPower);

            const healedOpponent = { ...mockOpponent, healthPower: mockOpponent.healthPower + 5 };
            service.setOpponentDamaged(false);
            damaged = false;
            service.setOpponent(healedOpponent);
            expect(damaged).toBeFalse();
            expect(service['previousOpponentHealth']).toBe(healedOpponent.healthPower);
        });
    });
});
