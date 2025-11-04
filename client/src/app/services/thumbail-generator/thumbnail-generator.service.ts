import { Injectable } from '@angular/core';
import {
    ITEM_IMAGE_MAP,
    MAX_THUMBNAIL_HEIGHT,
    MAX_THUMBNAIL_WIDTH,
    OBJECT_IMAGE_URLS,
    THUMBNAIL_TILE_SIZE,
    TILE_IMAGE_URLS,
} from '@app/constants/client-constants';
import { GameObjects } from '@common/game/game-enums';
import { Tile } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';

interface RenderContext {
    context: CanvasRenderingContext2D;
    tileSize: number;
    itemsMap: Map<string, GameObjects>;
}

@Injectable({
    providedIn: 'root',
})
export class ThumbnailGeneratorService {
    async generateGridImage(tiles: Tile[][], items: GameItem[]): Promise<string> {
        const { canvas, context } = this.createCanvas(tiles);
        if (!context) return Promise.resolve('');

        const itemsMap = this.createItemsMap(items);
        const renderContext: RenderContext = {
            context,
            tileSize: THUMBNAIL_TILE_SIZE,
            itemsMap,
        };

        await this.renderGrid(tiles, renderContext);

        return this.createScaledImage(canvas);
    }

    private createCanvas(tiles: Tile[][]): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D | null } {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        const rows = tiles.length;
        const cols = tiles[0].length;
        canvas.width = cols * THUMBNAIL_TILE_SIZE;
        canvas.height = rows * THUMBNAIL_TILE_SIZE;

        return { canvas, context };
    }

    private createItemsMap(items: GameItem[]): Map<string, GameObjects> {
        const itemsMap = new Map<string, GameObjects>();
        items.forEach((item) => {
            const key = `${item.position.x}-${item.position.y}`;
            itemsMap.set(key, item.item);
        });
        return itemsMap;
    }

    private async renderGrid(tiles: Tile[][], renderContext: RenderContext): Promise<void> {
        const tilePromises = tiles
            .map((row: Tile[], rowIndex: number) =>
                row.map(async (tile, colIndex) => this.loadImageInContext(tile, rowIndex, colIndex, renderContext)),
            )
            .reduce((acc, val) => acc.concat(val), []);

        await Promise.all(tilePromises);
    }

    private async loadImageInContext(tile: Tile, rowIndex: number, colIndex: number, renderContext: RenderContext): Promise<void> {
        const { context, tileSize, itemsMap } = renderContext;

        await this.renderTile(tile, colIndex, rowIndex, tileSize, context);

        const positionKey = `${colIndex}-${rowIndex}`;
        const itemAtPosition = itemsMap.get(positionKey);

        if (itemAtPosition) {
            await this.renderItem(itemAtPosition, colIndex, rowIndex, tileSize, context);
        } else if (tile.isSpawnPoint) {
            await this.renderSpawnPoint(colIndex, rowIndex, tileSize, context);
        }
    }

    private async renderTile(tile: Tile, colIndex: number, rowIndex: number, tileSize: number, context: CanvasRenderingContext2D): Promise<void> {
        return new Promise<void>((resolve) => {
            const image = new Image();
            image.src = tile.material || TILE_IMAGE_URLS.default;
            image.onload = () => {
                context.drawImage(image, colIndex * tileSize, rowIndex * tileSize, tileSize, tileSize);
                resolve();
            };
        });
    }

    private async renderItem(
        itemType: GameObjects,
        colIndex: number,
        rowIndex: number,
        tileSize: number,
        context: CanvasRenderingContext2D,
    ): Promise<void> {
        return new Promise<void>((resolve) => {
            const itemImage = new Image();
            itemImage.src = ITEM_IMAGE_MAP[itemType];
            itemImage.onload = () => {
                context.drawImage(itemImage, colIndex * tileSize, rowIndex * tileSize, tileSize, tileSize);
                resolve();
            };
        });
    }

    private async renderSpawnPoint(colIndex: number, rowIndex: number, tileSize: number, context: CanvasRenderingContext2D): Promise<void> {
        return new Promise<void>((resolve) => {
            const spawnImage = new Image();
            spawnImage.src = OBJECT_IMAGE_URLS.spawnPoint;
            spawnImage.onload = () => {
                context.drawImage(spawnImage, colIndex * tileSize, rowIndex * tileSize, tileSize, tileSize);
                resolve();
            };
        });
    }

    private createScaledImage(canvas: HTMLCanvasElement): string {
        const originalWidth = canvas.width;
        const originalHeight = canvas.height;

        const scaleFactor = Math.min(MAX_THUMBNAIL_WIDTH / originalWidth, MAX_THUMBNAIL_HEIGHT / originalHeight, 1);
        const outputCanvas = document.createElement('canvas');

        outputCanvas.width = originalWidth * scaleFactor;
        outputCanvas.height = originalHeight * scaleFactor;
        const outputContext = outputCanvas.getContext('2d');

        if (outputContext) {
            outputContext.drawImage(canvas, 0, 0, outputCanvas.width, outputCanvas.height);
        }

        return outputCanvas.toDataURL('image/png');
    }
}
