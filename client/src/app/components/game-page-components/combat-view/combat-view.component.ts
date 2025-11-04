import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CombatActionsComponent } from '@app/components/game-page-components/combat-actions/combat-actions.component';
import { CombatValueDisplayComponent } from '@app/components/game-page-components/combat-value-display/combat-value-display.component';
import { CombatViewTimerComponent } from '@app/components/game-page-components/combat-view-timer/combat-view-timer.component';
import { OpponentDialogueComponent } from '@app/components/game-page-components/opponent-dialogue/opponent-dialogue.component';
import { DAMAGE_ANIMATION_DURATION, VALUE_DISPLAY_DURATION } from '@app/constants/client-constants';
import { CombatStateService } from '@app/services/combat-state/combat-state.service';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { AttackResult } from '@common/player/attack-result';
import { CombatRole } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { BehaviorSubject, combineLatest, distinctUntilChanged, firstValueFrom, Subject, take, takeUntil } from 'rxjs';
@Component({
    selector: 'app-combat-view',
    imports: [CommonModule, CombatValueDisplayComponent, CombatActionsComponent, CombatViewTimerComponent, OpponentDialogueComponent],
    templateUrl: './combat-view.component.html',
    styleUrl: './combat-view.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CombatViewComponent implements OnInit, OnDestroy {
    readonly mainPlayerInfos$ = this.combatStateService.mainPlayerInfos$;
    readonly opponent$ = this.combatStateService.opponent$;
    readonly mainPlayerDamaged$ = this.combatStateService.mainPlayerDamaged$;
    readonly opponentDamaged$ = this.combatStateService.opponentDamaged$;
    readonly attackValue$ = this.combatStateService.attackValue$;
    readonly defenseValue$ = this.combatStateService.defenseValue$;
    readonly showAttackValue$ = this.combatStateService.showAttackValue$;
    readonly showDefenseValue$ = this.combatStateService.showDefenseValue$;
    readonly winnerName$ = this.combatStateService.winnerName$;
    readonly showVictoryMessage$ = this.combatStateService.showVictoryMessage$;
    readonly combatTimerValue$ = this.combatStateService.combatTimerValue$;
    readonly isCombatTurn$ = this.combatStateService.isCombatTurn$;
    readonly attackerDiceType$ = this.combatStateService.attackerDiceType$;
    readonly defenderDiceType$ = this.combatStateService.defenderDiceType$;
    readonly escapeFailed$ = this.combatStateService.escapeFailed$;
    readonly currentTurnPlayerId$ = this.combatStateService.currentTurnPlayerId$;
    readonly isInitialCombatPhase$ = this.combatStateService.isInitialCombatPhase$;
    readonly isMainPlayerAttacker$ = this.combatStateService.isMainPlayerAttacker$;
    readonly isMainPlayerDebuffed$ = new BehaviorSubject<boolean>(false);
    readonly isOpponentDebuffed$ = new BehaviorSubject<boolean>(false);

    private readonly destroy$ = new Subject<void>();

    constructor(
        private readonly playerService: PlayerService,
        private readonly combatService: CombatService,
        private readonly gameStateService: GameStateService,
        private readonly gameGridService: GameGridService,
        private readonly combatStateService: CombatStateService,
    ) {}

    ngOnInit() {
        this.combatStateService.resetCombatState();

        this.gameStateService.on<AttackResult>(GameGatewayEvents.PlayerAttacked, (attackState) => {
            this.handleAttackEvent(attackState);
        });

        this.gameStateService.on(GameGatewayEvents.PlayerEscaped, () => {
            this.combatService.setCombatView(false);
        });

        this.gameStateService.on(GameGatewayEvents.ExecuteAutoAttack, () => {
            this.attack(true);
        });

        this.gameStateService.on(GameGatewayEvents.PlayersUpdated, () => {
            this.updateCombatPlayers();
        });

        this.gameStateService.on(GameGatewayEvents.CombatEnded, (data: { winnerId?: string }) => {
            this.gameStateService.off(GameGatewayEvents.PlayerStatsUpdated);

            if (data?.winnerId) {
                const winner = this.playerService.getPlayerById(data.winnerId);
                if (winner) {
                    this.combatStateService.setWinnerName(winner.name);
                    this.combatStateService.setShowVictoryMessage(true);
                    this.combatService.setCombatVictoryMessage(winner.name);
                }
            }

            setTimeout(() => {
                this.combatService.setCombatView(false);
                const mainPlayerId = this.playerService.getMainPlayerId();
                const isMainPlayerTurn = this.playerService.isCurrentPlayerTurn;
                if (isMainPlayerTurn && mainPlayerId) {
                    const mainPlayerLost = data.winnerId && data.winnerId !== mainPlayerId && !data.winnerId.startsWith('bot-');
                    if (mainPlayerLost) {
                        this.gameStateService.nextTurn(this.gameGridService.gameId);
                    } else {
                        const continueTurn = this.playerService.continueTurn(this.gameGridService.tiles, this.gameGridService.size);

                        if (!continueTurn) {
                            this.gameStateService.nextTurn(this.gameGridService.gameId);
                        }
                    }
                }
                this.ngOnDestroy();
            }, 0);
        });

        this.gameStateService.on<number>(GameGatewayEvents.CombatTimerTick, (timerValue) => {
            this.combatStateService.setCombatTimerValue(timerValue);
        });

        this.gameStateService.on<number>(GameGatewayEvents.CombatTimerStart, (initialValue) => {
            this.combatStateService.setCombatTimerValue(initialValue);
        });

        this.gameStateService.on(GameGatewayEvents.CombatTimerEnd, () => {
            this.combatStateService.setCombatTimerValue(null);
        });

        this.gameStateService.on<string>(GameGatewayEvents.CombatTurnChanged, (currentCombatantId) => {
            this.combatStateService.setIsInitialCombatPhase(false);
            const mainPlayerId = this.playerService.getMainPlayerId();
            this.combatStateService.setIsCombatTurn(currentCombatantId === mainPlayerId);
            this.combatStateService.setCurrentTurnPlayerId(currentCombatantId);
        });

        this.gameStateService.on(GameGatewayEvents.UpdateItems, () => {
            this.gameStateService.getPlayers().then((players) => {
                this.playerService.updatePlayer(players);
            });

            this.gameStateService.getItems().then((items) => {
                this.gameGridService.setItems(items);
            });
        });

        this.playerService
            .getMainPlayerStats()
            .pipe(
                distinctUntilChanged((prev, curr) => prev === curr),
                takeUntil(this.destroy$),
            )
            .subscribe((infos) => {
                this.combatStateService.setMainPlayerInfos(infos);
            });

        this.combatService.combatData$.pipe(takeUntil(this.destroy$)).subscribe((data) => {
            if (data) {
                const mainPlayerId = this.playerService.getMainPlayerId();

                const isAttacker = data.attackerId === mainPlayerId;
                const mainPlayerRole = isAttacker ? CombatRole.Attacker : CombatRole.Target;
                const opponentRole = isAttacker ? CombatRole.Target : CombatRole.Attacker;

                const isMainPlayerDebuffed =
                    mainPlayerRole === CombatRole.Attacker ? data.isAttackerDebuffed || false : data.isTargetDebuffed || false;
                const isOpponentDebuffed = opponentRole === CombatRole.Attacker ? data.isAttackerDebuffed || false : data.isTargetDebuffed || false;

                this.isMainPlayerDebuffed$.next(isMainPlayerDebuffed);
                this.isOpponentDebuffed$.next(isOpponentDebuffed);

                if (data.attackerId === mainPlayerId) {
                    const opponentPlayer = this.playerService.players.find((p) => p._id === data.targetId) || null;
                    this.combatStateService.setOpponent(opponentPlayer);
                } else {
                    const opponentPlayer = this.playerService.getPlayerById(data.attackerId) || null;
                    this.combatStateService.setOpponent(opponentPlayer);
                }
            }
        });
    }

    ngOnDestroy() {
        this.gameStateService.off(GameGatewayEvents.PlayerAttacked);
        this.gameStateService.off(GameGatewayEvents.PlayersUpdated);
        this.gameStateService.off(GameGatewayEvents.CombatEnded);
        this.gameStateService.off(GameGatewayEvents.CombatTimerTick);
        this.gameStateService.off(GameGatewayEvents.CombatTimerStart);
        this.gameStateService.off(GameGatewayEvents.CombatTimerEnd);
        this.gameStateService.off(GameGatewayEvents.CombatTurnChanged);
        this.gameStateService.off(GameGatewayEvents.PlayerEscaped);
        this.gameStateService.off(GameGatewayEvents.ExecuteAutoAttack);
        this.gameStateService.off(GameGatewayEvents.UpdateItems);
        this.destroy$.next();
        this.destroy$.complete();
        this.combatStateService.resetCombatState();
    }

    handleAttackEvent(attackState: AttackResult): void {
        const mainPlayerId = this.playerService.getMainPlayerId();
        const isAttacker = attackState.attacker._id === mainPlayerId;

        this.combatStateService.setIsMainPlayerAttacker(isAttacker);
        this.combatStateService.setAttackerDiceType(attackState.attacker.attackPower);
        this.combatStateService.setDefenderDiceType(attackState.target.defensePower);
        this.combatStateService.setAttackValue(attackState.attackValue);
        this.combatStateService.setDefenseValue(attackState.defenseValue);
        this.combatStateService.setShowAttackValue(true);
        this.combatStateService.setShowDefenseValue(true);

        setTimeout(() => {
            this.combatStateService.setShowAttackValue(false);
            this.combatStateService.setShowDefenseValue(false);
        }, VALUE_DISPLAY_DURATION);

        if (isAttacker) {
            this.combatStateService.setOpponent(attackState.target);
            if (attackState.attackValue > attackState.defenseValue) {
                this.playDamageAnimation(false, true);
            }
        } else {
            this.combatStateService.setMainPlayerInfos(attackState.target);
            if (attackState.attackValue > attackState.defenseValue) {
                this.playDamageAnimation(true, false);
            }
        }
    }

    async updateCombatPlayers(): Promise<void> {
        const players = await this.gameStateService.getPlayers();

        const currentMainPlayer = await firstValueFrom(this.combatStateService.mainPlayerInfos$);
        const currentOpponent = await firstValueFrom(this.combatStateService.opponent$);

        if (currentOpponent) {
            const updatedOpponent = players.find((player) => player._id === currentOpponent._id);
            if (!updatedOpponent?.isConnected) {
                this.combatService.opponentDisconnected();
            } else if (updatedOpponent) {
                this.combatStateService.setOpponent(updatedOpponent);
            }
        }

        if (currentMainPlayer) {
            const updatedMainPlayer = players.find((player) => player._id === currentMainPlayer._id);
            if (updatedMainPlayer) {
                this.combatStateService.setMainPlayerInfos(updatedMainPlayer);
            }
        }
    }

    playDamageAnimation(isMainPlayer: boolean, isOpponent: boolean): void {
        if (isMainPlayer) {
            this.combatStateService.setMainPlayerDamaged(true);
            setTimeout(() => {
                this.combatStateService.setMainPlayerDamaged(false);
            }, DAMAGE_ANIMATION_DURATION);
        }

        if (isOpponent) {
            this.combatStateService.setOpponentDamaged(true);
            setTimeout(() => {
                this.combatStateService.setOpponentDamaged(false);
            }, DAMAGE_ANIMATION_DURATION);
        }
    }

    attack(isAnAutoAttack: boolean): void {
        combineLatest([this.combatStateService.opponent$, this.combatStateService.isCombatTurn$])
            .pipe(take(1))
            .subscribe(([opponent, isTurn]) => {
                if (!opponent || !isTurn) {
                    return;
                }
                this.combatService.attack(isAnAutoAttack, opponent._id);
            });
    }

    async forfeit(): Promise<void> {
        const opponent = this.combatStateService.getOpponent();
        const escaped = await this.combatService.forfeit(opponent?._id ?? '');

        if (escaped) {
            this.combatService.setCombatView(false);
        } else {
            this.combatStateService.setEscapeFailed(true);

            setTimeout(() => {
                this.combatStateService.setEscapeFailed(false);
            }, VALUE_DISPLAY_DURATION);
        }
    }
}
