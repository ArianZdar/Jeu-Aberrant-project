import { ChatService } from '@app/services/chat/chat.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class CombatGatewayService {
    private server: Server;

    constructor(
        private readonly gameManagerService: GameManagerService,
        private readonly combatTurnLogicService: CombatTurnLogicService,
        private readonly combatLogicService: CombatLogicService,
        private readonly chatService: ChatService,
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    async startCombatLogic(attackerId: string, targetId: string) {
        const playerId = attackerId;
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        if (!game) {
            return;
        }

        const attacker = game.players.find((p) => p._id === playerId);
        const target = game.players.find((p) => p._id === targetId);

        if (!attacker || !target) {
            return;
        }

        if (attacker.team === target.team && attacker.team !== Teams.None) {
            return;
        }

        if (attacker.actionPoints <= 0) {
            return;
        }

        attacker.actionPoints--;

        let firstPlayerId = attackerId;
        let secondPlayerId = targetId;
        if (attacker.maxSpeed < target.maxSpeed) {
            firstPlayerId = targetId;
            secondPlayerId = attackerId;
        }

        this.combatTurnLogicService.startCombat(game.id, firstPlayerId, secondPlayerId);

        const { isAttackerDebuffed, isTargetDebuffed } = this.gameManagerService.getPlayerDebuffs(playerId, targetId);

        this.server.to(game.id).emit(GameGatewayEvents.CombatStarted, {
            attackerId: playerId,
            targetId,
            isAttackerDebuffed,
            isTargetDebuffed,
        });

        this.chatService.startCombatEvent(game.id, attacker, target);
    }

    attemptEscape(playerId: string, targetId: string) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        if (!game) {
            return false;
        }
        const player = game.players.find((p) => p._id === playerId);
        if (!player) {
            return false;
        }
        const gameId = game.id;
        const canEscape = this.combatLogicService.tryToEscape(gameId, player);
        if (canEscape) {
            const target = game.players.find((p) => p._id === targetId);
            this.combatLogicService.resetPlayerHealth(target);
            this.combatLogicService.resetPlayerHealth(player);
            this.server.to(gameId).emit(GameGatewayEvents.PlayerEscaped, playerId);
            this.combatTurnLogicService.endCombat(gameId);
        }
        this.combatTurnLogicService.nextCombatTurn(gameId);
        this.server.to(gameId).emit(GameGatewayEvents.PlayersUpdated);
        return { canEscape };
    }

    opponentDisconnected(playerId: string) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        const player = game.players.find((p) => p._id === playerId);
        this.gameManagerService.opponentDisconnectedInCombat(playerId);
        this.server.to(game.id).emit(GameGatewayEvents.CombatEnded, { playerId });
        this.combatTurnLogicService.endCombat(game.id);
        if (player.isWinner) {
            this.server.to(game.id).emit(GameGatewayEvents.PlayerWonGame, player.name);
        }
    }

    toggleDebugMode(socket: Socket) {
        const playerId = socket.id;
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        const players = game?.players;
        const currentplayer = players?.find((player) => player._id === playerId);

        if (currentplayer?.isLeader) {
            game.toggleDebug();
            this.server.to(game.id).emit(GameGatewayEvents.ToggleDebug, game.isDebugModeActive);

            this.chatService.toggleDebugEvent(game, currentplayer);
        }
    }
}
