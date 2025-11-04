import { Game } from '@app/model/class/game/game';
import { Teams } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BotUtilsService {
    getAliveEnemies(game: Game, bot: Player): Player[] {
        return game.players.filter(
            (player) => player._id !== bot._id && player.isConnected && (player.team !== bot.team || player.team === Teams.None),
        );
    }

    getAdjacentEnemyToAttack(bot: Player, enemies: Player[]): Player | null {
        for (const enemy of enemies) {
            const canAttackThisPlayer = this.isAdjacent(bot.position, enemy.position) && (bot.team !== enemy.team || enemy.team === Teams.None);
            if (canAttackThisPlayer) {
                return enemy;
            }
        }
        return null;
    }

    canAttackEnemyFromThatTile(potentialPosition: Coordinate, enemy: Player): boolean {
        if (this.isAdjacent(potentialPosition, enemy.position)) {
            return true;
        }
        return false;
    }

    private isAdjacent(pos1: Coordinate, pos2: Coordinate): boolean {
        return (pos1.x === pos2.x && Math.abs(pos1.y - pos2.y) === 1) || (pos1.y === pos2.y && Math.abs(pos1.x - pos2.x) === 1);
    }
}
