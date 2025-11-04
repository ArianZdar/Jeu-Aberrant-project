import { Injectable } from '@angular/core';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { BehaviorSubject, Observable, timer } from 'rxjs';
import { COMBAT_END_DELAY } from '@app/constants/client-constants';

@Injectable({
    providedIn: 'root',
})
export class CombatService {
    showCombatView$: Observable<boolean>;
    attackMode$: Observable<boolean>;
    combatData$: Observable<{
        attackerId: string;
        targetId: string;
        isAttackerDebuffed?: boolean;
        isTargetDebuffed?: boolean;
    } | null>;

    combatVictoryMessage$: Observable<{ winnerName: string; show: boolean } | null>;

    private showCombatViewSubject = new BehaviorSubject<boolean>(false);
    private attackModeSubject = new BehaviorSubject<boolean>(false);
    private combatDataSubject = new BehaviorSubject<{ attackerId: string; targetId: string } | null>(null);
    private combatVictoryMessageSubject = new BehaviorSubject<{ winnerName: string; show: boolean } | null>(null);

    constructor(
        private gameStateService: GameStateService,
        private playerService: PlayerService,
    ) {
        this.showCombatView$ = this.showCombatViewSubject.asObservable();
        this.attackMode$ = this.attackModeSubject.asObservable();
        this.combatData$ = this.combatDataSubject.asObservable();
        this.combatVictoryMessage$ = this.combatVictoryMessageSubject.asObservable();

        this.gameStateService.combatData$.subscribe((data) => {
            if (data) {
                const mainPlayerId = this.playerService.getMainPlayerId();

                if (data.attackerId === mainPlayerId || data.targetId === mainPlayerId) {
                    this.combatDataSubject.next(data);
                    this.setCombatView(true);
                }
            }
        });
    }

    toggleCombatView(): void {
        this.showCombatViewSubject.next(!this.showCombatViewSubject.getValue());
    }

    opponentDisconnected(): void {
        this.gameStateService.opponentDisconnected();
    }

    setCombatView(show: boolean): void {
        this.showCombatViewSubject.next(show);
        this.gameStateService.getPlayers().then((players) => {
            this.playerService.updatePlayer(players);
        });
    }

    getCombatViewValue(): boolean {
        return this.showCombatViewSubject.getValue();
    }

    toggleAttackMode(): void {
        const currentPlayer = this.playerService.getMainPlayer();

        if (!currentPlayer) {
            return;
        }

        if (currentPlayer.actionPoints <= 0) {
            this.setAttackMode(false);
            return;
        }
        const currentMode = this.attackModeSubject.getValue();
        this.attackModeSubject.next(!currentMode);
    }

    setAttackMode(enable: boolean): void {
        this.attackModeSubject.next(enable);
    }

    getAttackModeValue(): boolean {
        return this.attackModeSubject.getValue();
    }

    async startCombat(targetId: string): Promise<void> {
        if (targetId === this.playerService.getMainPlayerId()) {
            return;
        }
        this.gameStateService.startCombat(targetId);
    }

    attack(isAnAutoAttack: boolean, targetId: string): void {
        this.gameStateService.attack(isAnAutoAttack, targetId);
    }

    async forfeit(targetId: string): Promise<boolean> {
        return await this.gameStateService.forfeitCombat(targetId);
    }

    setCombatVictoryMessage(winnerName: string): void {
        this.combatVictoryMessageSubject.next({ winnerName, show: true });

        timer(COMBAT_END_DELAY).subscribe(() => {
            this.combatVictoryMessageSubject.next(null);
        });
    }

    hideCombatVictoryMessage(): void {
        this.combatVictoryMessageSubject.next(null);
    }

    reset(): void {
        this.showCombatViewSubject.next(false);
        this.attackModeSubject.next(false);
        this.combatDataSubject.next(null);
        this.combatVictoryMessageSubject.next(null);
    }
}
