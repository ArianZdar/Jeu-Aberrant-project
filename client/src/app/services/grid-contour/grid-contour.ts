import { Injectable } from '@angular/core';
import { Coordinate } from '@common/game/game-info';

@Injectable({
    providedIn: 'root',
})
export class GridContour {
    getContourPath(reachableTiles: Coordinate[], gridSize: number): string {
        if (reachableTiles.length === 0) return '';

        const grid: boolean[][] = Array.from({ length: gridSize }, () => Array(gridSize).fill(false));
        reachableTiles.forEach((tile) => {
            grid[tile.y][tile.x] = true;
        });

        let completePath = '';

        reachableTiles.forEach((tile) => {
            const { x, y } = tile;

            if (y === 0 || !grid[y - 1][x]) {
                completePath += `M${x},${y} L${x + 1},${y} `;
            }

            if (x === gridSize - 1 || !grid[y][x + 1]) {
                completePath += `M${x + 1},${y} L${x + 1},${y + 1} `;
            }

            if (y === gridSize - 1 || !grid[y + 1][x]) {
                completePath += `M${x + 1},${y + 1} L${x},${y + 1} `;
            }

            if (x === 0 || !grid[y][x - 1]) {
                completePath += `M${x},${y + 1} L${x},${y} `;
            }
        });

        return completePath;
    }
}
