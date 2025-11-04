/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { mockGridTiles } from '@app/constants/mocks';
import { TEST_COORDINATE } from '@app/constants/test-constants';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { GridStateService } from './grid-state.service';

describe('GridStateService', () => {
    let service: GridStateService;
    const DEFAULT_ITEM_COUNT = 3;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GridStateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Grid Data Management', () => {
        const mockGrid = mockGridTiles;

        it('should set and get grid data', () => {
            service.setGridData(mockGrid);
            expect(service.getGridData()).toEqual(mockGrid);
        });

        it('should set and get original grid data', () => {
            service.setOriginalGridData(mockGrid);
            expect(service.getOriginalGridData()).toEqual(mockGrid);
        });
    });

    describe('Game Items Management', () => {
        const mockPosition = TEST_COORDINATE;
        const mockItem = { position: mockPosition, item: GameObjects.Armor };

        it('should add and remove game items', () => {
            expect(service.items.length).toBe(0);

            service.addGameItem(mockItem);
            expect(service.items.length).toBe(1);
            expect(service.items[0]).toEqual(mockItem);

            service.removeGameItem(mockItem);
            expect(service.items.length).toBe(0);
        });

        it('should move item from one position to another', () => {
            const newPosition = { x: 2, y: 2 };

            service.addGameItem(mockItem);
            service.moveItem(mockPosition, newPosition);

            expect(service.getItemAtPosition(mockPosition)).toBe(GameObjects.None);
            expect(service.getItemAtPosition(newPosition)).toBe(GameObjects.Armor);
        });
    });

    describe('Place and Delete Items', () => {
        const mockPosition = TEST_COORDINATE;
        let spawnPointCount: number | null = null;
        let randomItemCount: number | null = null;

        beforeEach(() => {
            service.setRandomItems(DEFAULT_ITEM_COUNT);
            service.setSpawnpointsToPlace(DEFAULT_ITEM_COUNT - 1);

            service.spawnPoints$.subscribe((value) => (spawnPointCount = value));
            service.randomItems$.subscribe((value) => (randomItemCount = value));
        });

        it('should place spawn point and decrement counter', () => {
            service.placeItem(GameObjects.Spawnpoint, mockPosition);

            expect(spawnPointCount).toBe(DEFAULT_ITEM_COUNT - 2);
            expect(service.items.length).toBe(0);
        });

        it('should place flag and decrement counter', () => {
            service.placeItem(GameObjects.Flag, mockPosition);

            expect(service.items.length).toBe(1);
            expect(service.items[0].item).toBe(GameObjects.Flag);
        });

        it('should place random item and decrement counter', () => {
            service.setRandomItems(1);
            service.placeItem(GameObjects.RandomItem, mockPosition);

            expect(randomItemCount).toBe(0);
            expect(service.items.length).toBe(1);
            expect(service.items[0].item).toBe(GameObjects.RandomItem);
        });

        it('should place regular item if random items available', () => {
            service.placeItem(GameObjects.Armor, mockPosition);

            expect(randomItemCount).toBe(DEFAULT_ITEM_COUNT - 1);
            expect(service.items.length).toBe(1);
            expect(service.items[0].item).toBe(GameObjects.Armor);
        });

        it('should not place regular item if random items are 0', () => {
            service.setRandomItems(0);
            service.placeItem(GameObjects.Armor, mockPosition);

            expect(service.items.length).toBe(0);
        });

        it('should delete spawn point and increment counter', () => {
            service.deleteItem(GameObjects.Spawnpoint);

            expect(spawnPointCount).toBe(DEFAULT_ITEM_COUNT);
        });

        it('should delete flag and increment counter', () => {
            service.placeItem(GameObjects.Flag, mockPosition);
            service.deleteItem(GameObjects.Flag, mockPosition);

            expect(service.items.length).toBe(0);
        });

        it('should delete random item and increment counter', () => {
            service.placeItem(GameObjects.RandomItem, mockPosition);
            service.deleteItem(GameObjects.RandomItem, mockPosition);

            expect(randomItemCount).toBe(DEFAULT_ITEM_COUNT);
            expect(service.items.length).toBe(0);
        });
    });

    describe('Random Items Management', () => {
        let randomItemCount: number | null = null;

        beforeEach(() => {
            service.randomItems$.subscribe((value) => (randomItemCount = value));
        });

        it('setRandomItems should update randomItemsSubject value', () => {
            expect(randomItemCount).toBeNull();
            service.setRandomItems(DEFAULT_ITEM_COUNT);
            expect(randomItemCount).toBe(DEFAULT_ITEM_COUNT);
        });

        it('canPlaceRandomItem should return true if randomItems value is not 0', () => {
            service.setRandomItems(1);
            expect(service.canPlaceRandomItem()).toBeTrue();
        });

        it('canPlaceRandomItem should return false if randomItems value is 0', () => {
            service.setRandomItems(0);
            expect(service.canPlaceRandomItem()).toBeFalse();
        });
    });

    describe('Spawn Points Management', () => {
        let spawnPointCount: number | null = null;

        beforeEach(() => {
            service.spawnPoints$.subscribe((value) => (spawnPointCount = value));
        });

        it('setSpawnpointsToPlace should update spawnPointsSubject value', () => {
            expect(spawnPointCount).toBeNull();
            service.setSpawnpointsToPlace(DEFAULT_ITEM_COUNT);
            expect(spawnPointCount).toBe(DEFAULT_ITEM_COUNT);
        });

        it('canPlaceSpawnpoint should return true if spawnPoints value is not 0', () => {
            service.setSpawnpointsToPlace(1);
            expect(service.canPlaceSpawnpoint()).toBeTrue();
        });

        it('canPlaceSpawnpoint should return false if spawnPoints value is 0', () => {
            service.setSpawnpointsToPlace(0);
            expect(service.canPlaceSpawnpoint()).toBeFalse();
        });
    });

    describe('canPlaceItem Method', () => {
        beforeEach(() => {
            service.setRandomItems(DEFAULT_ITEM_COUNT - 1);
            service.setSpawnpointsToPlace(1);
        });

        it('should return spawn point availability', () => {
            expect(service.canPlaceItem(GameObjects.Spawnpoint)).toBeTrue();

            service.setSpawnpointsToPlace(0);
            expect(service.canPlaceItem(GameObjects.Spawnpoint)).toBeFalse();
        });

        it('should return random item availability', () => {
            expect(service.canPlaceItem(GameObjects.RandomItem)).toBeTrue();

            service.setRandomItems(0);
            expect(service.canPlaceItem(GameObjects.RandomItem)).toBeFalse();
        });

        it('should return true for unique items if not already placed and random items available', () => {
            expect(service.canPlaceItem(GameObjects.Armor)).toBeTrue();
        });

        it('should return false for unique items if already placed', () => {
            service.addGameItem({ position: TEST_COORDINATE, item: GameObjects.Armor });
            expect(service.canPlaceItem(GameObjects.Armor)).toBeFalse();
        });

        it('should return false for unique items if no random items available', () => {
            service.setRandomItems(0);
            expect(service.canPlaceItem(GameObjects.Pickaxe)).toBeFalse();
        });

        it('should allow placing flag items regardless of random item count', () => {
            service.setRandomItems(0);

            expect(service.canPlaceItem(GameObjects.Flag)).toBeTrue();

            service.placeItem(GameObjects.Flag, TEST_COORDINATE);
            expect(service.canPlaceItem(GameObjects.Flag)).toBeFalse();

            expect(service.canPlaceItem(GameObjects.Armor)).toBeFalse();
        });
    });

    describe('Properties Management', () => {
        const testTitle = 'Test Title';
        const testDescription = 'Test Description';
        const testSize = 'small';

        it('should set and get title', () => {
            service.setTitle(testTitle);
            expect(service.getTitle()).toBe(testTitle);
        });

        it('should set and get description', () => {
            service.setDescription(testDescription);
            expect(service.getDescription()).toBe(testDescription);
        });

        it('should set and get size', () => {
            service.setSize(testSize);
            expect(service.getSize()).toBe(testSize);
        });

        it('should set and get game mode', () => {
            service.setGameMode(GameModes.Classic);
            expect(service.getGameMode()).toBe(GameModes.Classic);
        });
    });

    describe('Reset', () => {
        let spawnPointCount: number | null = null;
        let randomItemCount: number | null = null;

        beforeEach(() => {
            service.spawnPoints$.subscribe((value) => (spawnPointCount = value));
            service.randomItems$.subscribe((value) => (randomItemCount = value));
        });

        it('triggerReset should emit reset event', () => {
            let resetCalled = false;
            service.reset$.subscribe(() => {
                resetCalled = true;
            });
            service.triggerReset();
            expect(resetCalled).toBeTrue();
        });

        it('reset should clear all state', () => {
            const testTitle = 'Test';
            const testDescription = 'Test Description';

            service.setTitle(testTitle);
            service.setDescription(testDescription);
            service.setGameMode(GameModes.CTF);
            service.setSize('large');
            service.setRandomItems(DEFAULT_ITEM_COUNT);
            service.setSpawnpointsToPlace(DEFAULT_ITEM_COUNT - 1);
            service.addGameItem({ position: TEST_COORDINATE, item: GameObjects.Armor });

            service.reset();

            expect(service.getTitle()).toBe('');
            expect(service.getDescription()).toBe('');
            expect(service.getGameMode()).toBe(GameModes.Classic);
            expect(service.getSize()).toBe('');
            expect(randomItemCount).toBeNull();
            expect(spawnPointCount).toBeNull();
            expect(service.items.length).toBe(0);
        });
    });

    describe('Original Game Items', () => {
        it('should correctly filter flags when getting original number of game items', () => {
            const mockItems = [
                { position: { x: 0, y: 0 }, item: GameObjects.Armor },
                { position: { x: 1, y: 1 }, item: GameObjects.Flag },
                { position: { x: 2, y: 2 }, item: GameObjects.Pickaxe },
                { position: { x: 3, y: 3 }, item: GameObjects.Flag },
                { position: { x: 4, y: 4 }, item: GameObjects.SwiftnessBoots },
            ];

            service['config'].originalItems = mockItems;

            expect(service.getOriginalNumberOfGameItems()).toBe(3);
            service['config'].originalItems.push({ position: { x: 5, y: 5 }, item: GameObjects.RandomItem });
            expect(service.getOriginalNumberOfGameItems()).toBe(4);
        });
    });
});
