import { Game } from '@app/model/class/game/game';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';
import { BotStartCombatInterface } from '@common/events/data-interface';

@Injectable()
export class BotCombatService {
    private server: Server;

    constructor(
        private gameManagerService: GameManagerService,
        private turnLogicService: TurnLogicService,
        private botUtilsService: BotUtilsService,
    ) {}

    setServer(server: Server): void {
        this.server = server;
    }

    attackEnemy(game: Game, bot: Player, enemies: Player[]): void {
        if (!bot.isInCombat) {
            this.tryToAttackEnemy(game, bot, enemies);
        }

        if (this.botUtilsService.getAdjacentEnemyToAttack(bot, enemies) && bot.actionPoints <= 0 && !bot.isInCombat) {
            this.turnLogicService.endBotTurn(game.id);
        }
    }

    tryToAttackEnemy(game: Game, bot: Player, enemies: Player[]): boolean {
        const adjacentEnemy = this.botUtilsService.getAdjacentEnemyToAttack(bot, enemies);
        if (adjacentEnemy && bot.actionPoints > 0) {
            const data: BotStartCombatInterface = {
                botId: bot._id,
                targetId: adjacentEnemy._id,
            };
            this.server.to(game.id).emit(GameGatewayEvents.BotStartCombat, data);

            return true;
        }
        return false;
    }

    findClosestEnemy(game: Game, bot: Player, enemies: Player[]): Player | null {
        if (enemies.length === 0) return null;

        let closestEnemy = null;
        let shortestPathLength = Infinity;

        for (const enemy of enemies) {
            if (bot.team === enemy.team && enemy.team !== Teams.None) continue;
            const shortestPath = this.gameManagerService.getShortestPathToTileForBots(game.id, bot._id, enemy.position);

            if (shortestPath && shortestPath.length > 0 && shortestPath.length < shortestPathLength) {
                shortestPathLength = shortestPath.length;
                closestEnemy = enemy;
            }
        }
        return closestEnemy;
    }
}
