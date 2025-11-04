import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { CombatEndItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { TileState } from '@common/grid/grid-state';
import { CombatEndItemEffectInfo } from '@common/game/item-effect-info';
import { Player } from '@common/player/player';

export class BombBehavior implements CombatEndItemBehavior {
    applyCombatEndItemEffect(combatEndItemEffectInfo: CombatEndItemEffectInfo): void {
        if (combatEndItemEffectInfo.itemHolder.healthPower <= 0) {
            const opposingPlayerNewPosition = this.findClosestTileToSpawnpoint(
                combatEndItemEffectInfo.game,
                combatEndItemEffectInfo.opposingPlayer.spawnPointPosition,
            );

            combatEndItemEffectInfo.opposingPlayer.position = opposingPlayerNewPosition;
        }
    }

    private isTileAvailable(tile: TileState, position: Coordinate, playerPositions: Set<string>): boolean {
        const key = `${position.x},${position.y}`;
        return tile.tileCost !== Infinity && !playerPositions.has(key);
    }

    private getPlayerPositionsSet(players: Player[]): Set<string> {
        return new Set(players.map((p) => `${p.position.x},${p.position.y}`));
    }

    private getTile(tiles: TileState[][], x: number, y: number): TileState | null {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
            return tiles[y][x];
        }
        return null;
    }

    private findClosestTileToSpawnpoint(game: Game, spawnPointPosition: Coordinate): Coordinate | null {
        if (!game) return;

        const tiles = game.gridState.grid;
        const playerPositions = this.getPlayerPositionsSet(game.players);

        const visited = new Set<string>();
        const queue: Coordinate[] = [spawnPointPosition];
        visited.add(`${spawnPointPosition.x},${spawnPointPosition.y}`);

        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            const tile = this.getTile(tiles, current.x, current.y);

            if (tile && this.isTileAvailable(tile, current, playerPositions)) {
                return current;
            }

            for (const { dx, dy } of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const key = `${nx},${ny}`;

                if (!visited.has(key) && this.getTile(tiles, nx, ny)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return null;
    }
}
