import { ITEM_BEHAVIORS } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Coordinate, GameItem } from '@app/model/schema/game-item.schema';
import { CombatEndItemEffectInfo, CombatItemEffectInfo, PassiveItemEffectInfo } from '@common/game/item-effect-info';
import { TileState } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';
import { CombatEndItemBehavior, CombatItemBehavior, ItemBehavior, PassiveItemBehavior } from './items/item-behavior';

@Injectable()
export class ItemBehaviorService {
    applyPassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo) {
        if (this.playerHasEffect(passiveItemEffectInfo.player, passiveItemEffectInfo.gameItem)) return;

        const itemBehavior = ITEM_BEHAVIORS[passiveItemEffectInfo.gameItem.item];

        if (this.hasPassiveEffect(itemBehavior)) itemBehavior.applyPassiveItemEffect(passiveItemEffectInfo);
    }

    removePassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo) {
        if (!this.playerHasEffect(passiveItemEffectInfo.player, passiveItemEffectInfo.gameItem)) return;

        const itemBehavior = ITEM_BEHAVIORS[passiveItemEffectInfo.gameItem.item];

        if (this.hasPassiveEffect(itemBehavior)) itemBehavior.removePassiveItemEffect(passiveItemEffectInfo);
    }

    applyCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo) {
        if (this.playerHasEffect(combatItemEffectInfo.player, combatItemEffectInfo.gameItem)) return;

        const itemBehavior = ITEM_BEHAVIORS[combatItemEffectInfo.gameItem.item];

        if (this.hasCombatEffect(itemBehavior)) itemBehavior.applyCombatItemEffect(combatItemEffectInfo);
    }

    removeCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo) {
        if (!this.playerHasEffect(combatItemEffectInfo.player, combatItemEffectInfo.gameItem)) return;

        const itemBehavior = ITEM_BEHAVIORS[combatItemEffectInfo.gameItem.item];

        if (this.hasCombatEffect(itemBehavior)) itemBehavior.removeCombatItemEffect(combatItemEffectInfo);
    }

    applyCombatEndItemEffect(combatEndItemEffectInfo: CombatEndItemEffectInfo) {
        const itemBehavior = ITEM_BEHAVIORS[combatEndItemEffectInfo.gameItem.item];

        if (this.hasCombatEndEffect(itemBehavior)) itemBehavior.applyCombatEndItemEffect(combatEndItemEffectInfo);
    }

    dropAllItems(game: Game, player: Player): Player[] {
        const dropPositions = this.findClosestItemPlacements(game, player);

        player.items.forEach((item, index) => {
            item.position = dropPositions[index];
            this.removePassiveItemEffect({ player, gameItem: item });
        });
        player.items = [];

        return game.players;
    }

    private findClosestItemPlacements(game: Game, player: Player): (Coordinate | null)[] {
        const grid = game.gridState.grid;
        const occupied = this.getOccupiedPositions(game);
        const newlyTaken = new Set<string>();
        const result: (Coordinate | null)[] = [];

        player.items.forEach(() => {
            const position = this.findClosestAvailablePosition(player.position, grid, occupied, newlyTaken);

            if (position) {
                newlyTaken.add(this.coordinateKey(position));
            }
            result.push(position);
        });

        return result;
    }

    private coordinateKey(pos: Coordinate): string {
        return `${pos.x},${pos.y}`;
    }

    private getOccupiedPositions(game: Game): Set<string> {
        const occupied = new Set<string>();

        for (const player of game.players) {
            occupied.add(this.coordinateKey(player.position));
        }

        for (const item of game.items) {
            occupied.add(this.coordinateKey(item.position));
        }

        return occupied;
    }

    private getTile(grid: TileState[][], pos: Coordinate): TileState | null {
        const numColumns = grid.length;
        const numRows = grid[0]?.length || 0;

        if (pos.x < 0 || pos.x >= numColumns || pos.y < 0 || pos.y >= numRows) {
            return null;
        }
        return grid[pos.x][pos.y];
    }

    private getNeighbors(pos: Coordinate, grid: TileState[][]): Coordinate[] {
        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];

        const numColumns = grid.length;
        const numRows = grid[0]?.length || 0;

        return directions
            .map(({ dx, dy }) => ({ x: pos.x + dx, y: pos.y + dy }))
            .filter((n) => n.x >= 0 && n.x < numColumns && n.y >= 0 && n.y < numRows);
    }

    private isTileAvailable(tile: TileState | null, pos: Coordinate, occupied: Set<string>, newlyTaken: Set<string>): boolean {
        const key = this.coordinateKey(pos);
        const isAvailable = tile.tileCost !== Infinity && !occupied.has(key) && !newlyTaken.has(key);

        return isAvailable;
    }

    private findClosestAvailablePosition(start: Coordinate, grid: TileState[][], occupied: Set<string>, newlyTaken: Set<string>): Coordinate | null {
        const visited = new Set<string>();
        const queue: Coordinate[] = [start];
        visited.add(this.coordinateKey(start));

        while (queue.length > 0) {
            const current = queue.shift();
            const tile = this.getTile(grid, current);

            if (tile && this.isTileAvailable(tile, current, occupied, newlyTaken)) {
                return current;
            }

            for (const neighbor of this.getNeighbors(current, grid)) {
                const neighborKey = this.coordinateKey(neighbor);
                if (!visited.has(neighborKey)) {
                    visited.add(neighborKey);
                    queue.push(neighbor);
                }
            }
        }

        return null;
    }

    private playerHasEffect(player: Player, buffItem: GameItem) {
        return player.activeBuffs.find((item) => item === buffItem.item);
    }

    private hasPassiveEffect(behavior: ItemBehavior): behavior is PassiveItemBehavior {
        return typeof behavior?.applyPassiveItemEffect === 'function';
    }

    private hasCombatEffect(behavior: ItemBehavior): behavior is CombatItemBehavior {
        return typeof behavior?.applyCombatItemEffect === 'function';
    }

    private hasCombatEndEffect(behavior: ItemBehavior): behavior is CombatEndItemBehavior {
        return typeof behavior?.applyCombatEndItemEffect === 'function';
    }
}
