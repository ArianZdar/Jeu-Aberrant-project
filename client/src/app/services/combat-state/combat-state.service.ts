// Les Behavior private doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { Player } from '@common/player/player';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class CombatStateService {
    private mainPlayerInfosSubject = new BehaviorSubject<Player | null>(null);
    private opponentSubject = new BehaviorSubject<Player | null>(null);
    private previousMainPlayerHealth: number | null = null;
    private previousOpponentHealth: number | null = null;

    private mainPlayerDamagedSubject = new BehaviorSubject<boolean>(false);
    private opponentDamagedSubject = new BehaviorSubject<boolean>(false);

    private attackValueSubject = new BehaviorSubject<number>(0);
    private defenseValueSubject = new BehaviorSubject<number>(0);
    private showAttackValueSubject = new BehaviorSubject<boolean>(false);
    private showDefenseValueSubject = new BehaviorSubject<boolean>(false);
    private attackerDiceTypeSubject = new BehaviorSubject<number>(0);
    private defenderDiceTypeSubject = new BehaviorSubject<number>(0);

    private winnerNameSubject = new BehaviorSubject<string | null>(null);
    private showVictoryMessageSubject = new BehaviorSubject<boolean>(false);
    private combatTimerValueSubject = new BehaviorSubject<number | null>(null);
    private isCombatTurnSubject = new BehaviorSubject<boolean>(false);
    private escapeFailedSubject = new BehaviorSubject<boolean>(false);
    private currentTurnPlayerIdSubject = new BehaviorSubject<string | null>(null);
    private isInitialCombatPhase = new BehaviorSubject<boolean>(true);
    private isMainPlayerAttacker = new BehaviorSubject<boolean>(true);

    readonly mainPlayerInfos$ = this.mainPlayerInfosSubject.asObservable();
    readonly opponent$ = this.opponentSubject.asObservable();
    readonly mainPlayerDamaged$ = this.mainPlayerDamagedSubject.asObservable();
    readonly opponentDamaged$ = this.opponentDamagedSubject.asObservable();
    readonly attackValue$ = this.attackValueSubject.asObservable();
    readonly defenseValue$ = this.defenseValueSubject.asObservable();
    readonly showAttackValue$ = this.showAttackValueSubject.asObservable();
    readonly showDefenseValue$ = this.showDefenseValueSubject.asObservable();
    readonly winnerName$ = this.winnerNameSubject.asObservable();
    readonly showVictoryMessage$ = this.showVictoryMessageSubject.asObservable();
    readonly combatTimerValue$ = this.combatTimerValueSubject.asObservable();
    readonly isCombatTurn$ = this.isCombatTurnSubject.asObservable();
    readonly attackerDiceType$ = this.attackerDiceTypeSubject.asObservable();
    readonly defenderDiceType$ = this.defenderDiceTypeSubject.asObservable();
    readonly escapeFailed$ = this.escapeFailedSubject.asObservable();
    readonly currentTurnPlayerId$ = this.currentTurnPlayerIdSubject.asObservable();
    readonly isInitialCombatPhase$ = this.isInitialCombatPhase.asObservable();
    readonly isMainPlayerAttacker$ = this.isMainPlayerAttacker.asObservable();

    setMainPlayerInfos(player: Player | null): void {
        const previousHealth = this.previousMainPlayerHealth;
        this.previousMainPlayerHealth = player?.healthPower || null;
        this.mainPlayerInfosSubject.next(player);

        if (previousHealth !== null && player && player.healthPower < previousHealth) {
            this.setMainPlayerDamaged(true);
        }
    }

    getMainPlayerInfos(): Player | null {
        return this.mainPlayerInfosSubject.value;
    }

    setOpponent(player: Player | null): void {
        const previousHealth = this.previousOpponentHealth;
        this.previousOpponentHealth = player?.healthPower || null;
        this.opponentSubject.next(player);

        if (previousHealth !== null && player && player.healthPower < previousHealth) {
            this.setOpponentDamaged(true);
        }
    }

    getOpponent(): Player | null {
        return this.opponentSubject.value;
    }

    setMainPlayerDamaged(damaged: boolean): void {
        this.mainPlayerDamagedSubject.next(damaged);
    }

    setOpponentDamaged(damaged: boolean): void {
        this.opponentDamagedSubject.next(damaged);
    }

    setAttackValue(value: number): void {
        this.attackValueSubject.next(value);
    }

    setDefenseValue(value: number): void {
        this.defenseValueSubject.next(value);
    }

    setShowAttackValue(show: boolean): void {
        this.showAttackValueSubject.next(show);
    }

    setShowDefenseValue(show: boolean): void {
        this.showDefenseValueSubject.next(show);
    }

    setAttackerDiceType(diceType: number): void {
        this.attackerDiceTypeSubject.next(diceType);
    }

    setDefenderDiceType(diceType: number): void {
        this.defenderDiceTypeSubject.next(diceType);
    }

    setWinnerName(name: string | null): void {
        this.winnerNameSubject.next(name);
    }

    setShowVictoryMessage(show: boolean): void {
        this.showVictoryMessageSubject.next(show);
    }

    setCombatTimerValue(value: number | null): void {
        this.combatTimerValueSubject.next(value);
    }

    setIsCombatTurn(isTurn: boolean): void {
        this.isCombatTurnSubject.next(isTurn);
    }

    setEscapeFailed(failed: boolean): void {
        this.escapeFailedSubject.next(failed);
    }

    setCurrentTurnPlayerId(id: string | null): void {
        this.currentTurnPlayerIdSubject.next(id);
    }

    setIsInitialCombatPhase(isInitial: boolean): void {
        this.isInitialCombatPhase.next(isInitial);
    }

    setIsMainPlayerAttacker(isAttacker: boolean): void {
        this.isMainPlayerAttacker.next(isAttacker);
    }

    resetCombatState(): void {
        this.mainPlayerInfosSubject.next(null);
        this.opponentSubject.next(null);
        this.mainPlayerDamagedSubject.next(false);
        this.opponentDamagedSubject.next(false);
        this.attackValueSubject.next(0);
        this.defenseValueSubject.next(0);
        this.showAttackValueSubject.next(false);
        this.showDefenseValueSubject.next(false);
        this.winnerNameSubject.next(null);
        this.showVictoryMessageSubject.next(false);
        this.combatTimerValueSubject.next(null);
        this.isCombatTurnSubject.next(false);
        this.attackerDiceTypeSubject.next(0);
        this.defenderDiceTypeSubject.next(0);
        this.escapeFailedSubject.next(false);
        this.currentTurnPlayerIdSubject.next(null);
        this.isInitialCombatPhase.next(true);
        this.isMainPlayerAttacker.next(true);
        this.previousMainPlayerHealth = null;
        this.previousOpponentHealth = null;
    }
}
