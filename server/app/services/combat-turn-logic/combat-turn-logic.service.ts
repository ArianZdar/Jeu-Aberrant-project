import { FAKE_HUMAN_DELAY, MS_OF_ONE_SECOND } from '@app/constants/server-constants';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { MAX_ESCAPES_ATTEMPTS, REDUCED_COMBAT_TURN_DURATION, STANDARD_COMBAT_TURN_DURATION } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class CombatTurnLogicService {
    private gameCombatTimerValueMap: Map<string, number> = new Map();
    private gameCombatTimerIntervalMap: Map<string, NodeJS.Timeout> = new Map();
    private combatActive: Map<string, boolean> = new Map();
    private combatParticipantsMap: Map<string, { firstPlayerToAttack: string; secondPlayerToAttack: string }> = new Map();
    private currentCombatantMap: Map<string, string> = new Map();
    private botAttackHandler: (gameId: string, combatStarterId: string, combatOpponentId: string) => void;

    private server: Server;
    private turnLogicService: TurnLogicService;

    constructor(turnLogicService: TurnLogicService) {
        this.turnLogicService = turnLogicService;
        this.botAttackHandler = () => {
            return;
        };
    }

    registerBotAttackHandler(handler: (gameId: string, botId: string, targetId: string) => void): void {
        this.botAttackHandler = handler;
    }

    setServer(server: Server) {
        this.server = server;
    }

    startCombat(gameId: string, firstPlayerId: string, secondPlayerId: string): void {
        this.combatParticipantsMap.set(gameId, { firstPlayerToAttack: firstPlayerId, secondPlayerToAttack: secondPlayerId });
        this.currentCombatantMap.set(gameId, secondPlayerId);
        this.setInCombat(gameId, firstPlayerId, secondPlayerId);
        this.startCombatTurn(gameId, secondPlayerId, true);
        this.turnLogicService.pauseTurnTimer(gameId);
    }

    startCombatTurn(gameId: string, playerId: string, isFirstTurn: boolean): void {
        const players = this.turnLogicService.getPlayers(gameId);
        if (!players) {
            return;
        }
        const currentPlayer = players.find((player) => player._id === playerId);

        const timer = currentPlayer.escapesAttempts === MAX_ESCAPES_ATTEMPTS ? REDUCED_COMBAT_TURN_DURATION : STANDARD_COMBAT_TURN_DURATION;

        this.startCombatTimer(gameId, timer, isFirstTurn);

        this.currentCombatantMap.set(gameId, playerId);

        players.forEach((player) => {
            player.isCombatTurn = player._id === playerId;
        });

        this.combatActive.set(gameId, true);

        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.CombatTurnChanged, playerId);
            this.server.to(gameId).emit(GameGatewayEvents.PlayersUpdated);
        }
    }

    nextCombatTurn(gameId: string): void {
        const participants = this.combatParticipantsMap.get(gameId);
        if (!participants) {
            return;
        }

        const currentPlayerId = this.getCurrentCombatTurnPlayer(gameId);
        if (!currentPlayerId) {
            return;
        }

        const nextPlayerId =
            participants.firstPlayerToAttack === currentPlayerId ? participants.secondPlayerToAttack : participants.firstPlayerToAttack;
        this.clearCombatTimer(gameId);
        this.startCombatTurn(gameId, nextPlayerId, false);
    }

    startCombatTimer(gameId: string, durationSeconds: number, isFirstTurn: boolean): void {
        this.clearCombatTimer(gameId);
        this.gameCombatTimerValueMap.set(gameId, durationSeconds);
        this.turnLogicService.pauseTurnTimer(gameId);

        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.CombatTimerStart, durationSeconds);
        }
        const botRandomAttackDelay = (FAKE_HUMAN_DELAY - MS_OF_ONE_SECOND * Math.random()) / MS_OF_ONE_SECOND;

        const interval = setInterval(() => {
            let timerValue = this.gameCombatTimerValueMap.get(gameId) || 0;
            timerValue--;
            this.gameCombatTimerValueMap.set(gameId, timerValue);

            if (this.server) {
                this.server.to(gameId).emit(GameGatewayEvents.CombatTimerTick, timerValue);
            }

            const shouldAutoAttack = timerValue <= 0 || timerValue <= botRandomAttackDelay;
            const isTurnEnd = timerValue <= 0;

            if (shouldAutoAttack) {
                if (!isFirstTurn) {
                    this.executeAutoAttack(gameId, timerValue);
                } else if (isTurnEnd) {
                    this.nextCombatTurn(gameId);
                }
            }
        }, MS_OF_ONE_SECOND);

        this.gameCombatTimerIntervalMap.set(gameId, interval);
    }

    executeAutoAttack(gameId: string, timerValue: number): void {
        const players = this.turnLogicService.getPlayers(gameId);
        const currentCombatantId = this.getCurrentCombatTurnPlayer(gameId);
        const currentPlayer = players.find((player) => player._id === currentCombatantId);
        const combat = this.combatParticipantsMap.get(gameId);

        if (!combat || !currentPlayer) return;

        if (currentPlayer.isBot && currentPlayer.isCombatTurn) {
            this.botAttackHandler(gameId, combat.firstPlayerToAttack, combat.secondPlayerToAttack);
            this.nextCombatTurn(gameId);
        } else if (timerValue <= 0) {
            this.server.to(gameId).emit(GameGatewayEvents.ExecuteAutoAttack);
            this.nextCombatTurn(gameId);
        }
    }

    clearCombatTimer(gameId: string): void {
        const interval = this.gameCombatTimerIntervalMap.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameCombatTimerIntervalMap.delete(gameId);
        }
    }

    endCombat(gameId: string): void {
        this.clearCombatTimer(gameId);
        this.turnLogicService.resumeTurnTimer(gameId);
        this.combatActive.set(gameId, false);
        this.combatParticipantsMap.delete(gameId);
        this.currentCombatantMap.delete(gameId);

        const players = this.turnLogicService.getPlayers(gameId);
        if (players) {
            players.forEach((player) => {
                player.isCombatTurn = false;
                player.isInCombat = false;
            });
        }

        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.CombatTimerEnd);
            this.turnLogicService.resumeTurnTimer(gameId);
        }
    }

    cleanupGame(gameId: string): void {
        this.clearCombatTimer(gameId);
        this.gameCombatTimerValueMap.delete(gameId);
        this.combatActive.delete(gameId);
        this.combatParticipantsMap.delete(gameId);
        this.currentCombatantMap.delete(gameId);
    }

    isCombatActive(gameId: string): boolean {
        return this.combatActive.get(gameId) || false;
    }

    getCurrentCombatTurnPlayer(gameId: string): string | undefined {
        return this.currentCombatantMap.get(gameId);
    }

    private setInCombat(gameId: string, firstPlayerId: string, secondPlayerId: string): void {
        const players = this.turnLogicService.getPlayers(gameId);
        for (const player of players) {
            if (player._id === firstPlayerId || player._id === secondPlayerId) {
                player.isInCombat = true;
            }
        }
    }
}
