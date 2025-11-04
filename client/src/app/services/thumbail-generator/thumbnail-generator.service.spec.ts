/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { GameObjects } from '@common/game/game-enums';
import { Tile, TILE_IMAGE_URLS } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { ThumbnailGeneratorService } from './thumbnail-generator.service';

describe('ThumbnailGeneratorService', () => {
    let service: ThumbnailGeneratorService;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [ThumbnailGeneratorService],
        });
        service = TestBed.inject(ThumbnailGeneratorService);
    });

    const setupCanvasAndImageMocks = () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        spyOn(document, 'createElement').and.returnValue(canvas);
        spyOn(canvas, 'getContext').and.returnValue(context);

        const image = new Image();
        spyOn(window, 'Image').and.returnValue(image);

        Object.defineProperty(image, 'onload', {
            get: () => null,
            set: (fn: () => void) => {
                fn();
            },
        });

        return { canvas, context, image };
    };

    const createTiles = (material: string, isSpawnPoint: boolean, rows: number, cols: number): Tile[][] => {
        return Array.from({ length: rows }, () =>
            Array.from({ length: cols }, () => ({
                tileType: 'terrain',
                material,
                isSpawnPoint,
            })),
        );
    };

    const mockItems: GameItem[] = [
        { position: { x: 0, y: 0 }, item: GameObjects.Armor },
        { position: { x: 1, y: 1 }, item: GameObjects.Pickaxe },
    ];

    it('should generate a grid image', async () => {
        const { context } = setupCanvasAndImageMocks();
        const tiles = createTiles('grass', true, 2, 2);

        if (context) {
            spyOn(context, 'drawImage').and.callThrough();
        }

        const result = await service.generateGridImage(tiles, mockItems);

        expect(document.createElement).toHaveBeenCalledWith('canvas');

        if (context) {
            expect(context.drawImage).toHaveBeenCalled();
        }

        expect(result).toBeTruthy();
    });

    it('should handle null context', async () => {
        const canvas = document.createElement('canvas');
        spyOn(document, 'createElement').and.returnValue(canvas);
        spyOn(canvas, 'getContext').and.returnValue(null);

        const tiles = createTiles('grass', false, 1, 1);

        const result = await service.generateGridImage(tiles, []);

        expect(result).toBe('');
    });

    it('should set image.src to default if material is empty', async () => {
        const { image } = setupCanvasAndImageMocks();

        const tilesWithEmptyMaterial: Tile[][] = [[{ tileType: 'terrain', material: '', isSpawnPoint: false }]];

        await service.generateGridImage(tilesWithEmptyMaterial, []);

        const expectedPath = TILE_IMAGE_URLS.default.replace('./', '');
        expect(image.src.endsWith(expectedPath)).toBeTrue();
    });

    it('should scale the image', async () => {
        const { context } = setupCanvasAndImageMocks();
        const tiles = createTiles('grass', false, 2, 2);

        if (context) {
            spyOn(context, 'drawImage').and.callThrough();
        }

        const result = await service.generateGridImage(tiles, []);

        expect(result).toBeTruthy();
    });

    it('should render items on the grid', async () => {
        const { context } = setupCanvasAndImageMocks();
        const tiles = createTiles('grass', false, 2, 2);

        if (context) {
            spyOn(context, 'drawImage').and.callThrough();
        }

        await service.generateGridImage(tiles, mockItems);

        if (context) {
            expect(context.drawImage).toHaveBeenCalledTimes(7);
        }
    });

    it('should render spawn points when specified', async () => {
        const { context } = setupCanvasAndImageMocks();
        const tilesWithSpawnPoint = [
            [
                { tileType: 'terrain', material: 'grass', isSpawnPoint: true },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
            ],
            [
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
            ],
        ];

        if (context) {
            spyOn(context, 'drawImage').and.callThrough();
        }

        await service.generateGridImage(tilesWithSpawnPoint, []);

        if (context) {
            expect(context.drawImage).toHaveBeenCalledTimes(6);
        }
    });
});
