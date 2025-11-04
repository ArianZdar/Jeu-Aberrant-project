import { ITEM_CATEGORY_MAP, ItemCategory } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BotItemService {
    constructor(private gameManagerService: GameManagerService) {}

    findClosestItemByCategory(game: Game, bot: Player): { position: Coordinate; item: GameObjects } | null {
        let items = this.getItemsBasedOnStrategy(game, bot.isAggressive);

        if (!this.hasValidItems(items)) {
            items = this.getItemsBasedOnStrategy(game, !bot.isAggressive);
        }

        if (!items.length) return null;

        return this.findClosestItemByPath(game, bot, items);
    }

    getItemsBasedOnStrategy(game: Game, isAggressive: boolean): { position: Coordinate; item: GameObjects }[] {
        return isAggressive ? this.getAgressiveItems(game) : this.getDefensiveItems(game);
    }

    hasValidItems(items: { position: Coordinate; item: GameObjects }[]): boolean {
        return items.length > 0 && (items[0].position.x !== -1 || items[0].position.y !== -1);
    }

    findClosestItemByPath(
        game: Game,
        bot: Player,
        items: { position: Coordinate; item: GameObjects }[],
    ): { position: Coordinate; item: GameObjects } | null {
        let closestItem = null;
        let shortestPathLength = Infinity;

        for (const item of items) {
            const itemPath = this.gameManagerService.getShortestPathToTileForBots(game.id, bot._id, item.position);

            if (itemPath && itemPath.length > 0 && itemPath.length < shortestPathLength) {
                shortestPathLength = itemPath.length;
                closestItem = item;
            }
        }

        return closestItem;
    }

    getAgressiveItems(game: Game) {
        return Array.from(game.items).filter((item) => item.item && ITEM_CATEGORY_MAP[item.item] === ItemCategory.Offensive);
    }

    getDefensiveItems(game: Game) {
        return Array.from(game.items).filter((item) => item.item && ITEM_CATEGORY_MAP[item.item] === ItemCategory.Defensive);
    }

    findFlagPosition(game: Game): Coordinate | null {
        for (const item of game.items) {
            if (item.item === GameObjects.Flag) {
                if (item.position.x === -1 || item.position.y === -1) {
                    return null;
                }
                return item.position;
            }
        }
        return null;
    }
}
