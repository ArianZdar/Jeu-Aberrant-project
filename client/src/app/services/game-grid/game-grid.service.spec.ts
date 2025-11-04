/* eslint-disable max-lines */
import { TestBed } from '@angular/core/testing';
import { ITEM_DESCRIPTION_MAP, ITEM_DISPLAY_NAMES, TILE_IMAGE_URLS } from '@app/constants/client-constants';
import { getFakeGameInfo, mockCoordinateList } from '@app/constants/mocks';
import { TEST_COORDINATE, TEST_PATH, TEST_REACHABLE_TILES, TEST_TARGET_TILE, TEST_UNREACHABLE_TILE } from '@app/constants/test-constants';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { GameService } from '@app/services/game/game.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameObjects } from '@common/game/game-enums';
import { GameInfo, TileMaterial, TileType } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { of } from 'rxjs';

describe('GameGridService', () => {
    let service: GameGridService;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;

    beforeEach(() => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['getGameById']);
        gameServiceMock.getGameById.and.returnValue(of(getFakeGameInfo()));
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['getAccessibleTiles', 'getShortestPathToTile', 'useDoor']);

        TestBed.configureTestingModule({
            providers: [
                GameGridService,
                { provide: GameService, useValue: gameServiceMock },
                { provide: GameStateService, useValue: gameStateServiceMock },
            ],
        });
        service = TestBed.inject(GameGridService);
    });

    describe('Initialisation', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });
    });

    describe('Setter methods', () => {
        it('should set the gameId correctly', () => {
            const gameId = 'test-game-id';
            service.setGameId(gameId);
            gameStateServiceMock.getAccessibleTiles.and.resolveTo(mockCoordinateList);
            service.updateReachableTiles();
            expect(gameStateServiceMock.getAccessibleTiles).toHaveBeenCalledWith();
        });

        it('should set the playerId correctly', () => {
            const gameId = 'test-game-id';
            const playerId = 'test-player-id';

            service.setGameId(gameId);
            service.setPlayerId(playerId);

            gameStateServiceMock.getShortestPathToTile.and.resolveTo({ path: mockCoordinateList, firstItemOnPath: undefined });
            service.getShortestPathToTile(TEST_COORDINATE);

            expect(gameStateServiceMock.getShortestPathToTile).toHaveBeenCalledWith(gameId, playerId, TEST_COORDINATE);
        });
    });

    describe('setTilesByGameId', () => {
        it('should fetch game data and set tiles, title and size', async () => {
            const gameId = 'test-game-id';
            const fakeGame = getFakeGameInfo();

            gameServiceMock.getGameById.and.returnValue(of(fakeGame));

            await service.setTilesByGameId(gameId);

            expect(gameServiceMock.getGameById).toHaveBeenCalledWith(gameId);
            expect(service.getTiles()).toEqual(fakeGame.gameGrid.tiles);
            expect(service.getTitle()).toEqual(fakeGame.name);
            expect(service.getSize()).toEqual(`(${fakeGame.gameGrid.tiles.length}x${fakeGame.gameGrid.tiles.length})`);
        });
    });

    describe('Getter methods', () => {
        let fakeGame: GameInfo & { _id: string };

        beforeEach(async () => {
            fakeGame = getFakeGameInfo();
            gameServiceMock.getGameById.and.returnValue(of(fakeGame));
            await service.setTilesByGameId('test-game-id');
        });

        it('should return tiles', () => {
            expect(service.getTiles()).toEqual(fakeGame.gameGrid.tiles);
        });

        it('should return title', () => {
            expect(service.getTitle()).toEqual(fakeGame.name);
        });

        it('should return size formatted as (NxN)', () => {
            const size = fakeGame.gameGrid.tiles.length;
            expect(service.getSize()).toEqual(`(${size}x${size})`);
        });

        it('should return gameId', () => {
            const testGameId = 'test-game-id-123';
            service.setGameId(testGameId);
            expect(service.getGameId()).toBe(testGameId);
        });
    });

    describe('canTravelToTile', () => {
        it('should return true if tile is in reachableTiles', async () => {
            const reachableTiles = [
                { x: 1, y: 2 },
                { x: 3, y: 4 },
            ];
            gameStateServiceMock.getAccessibleTiles.and.resolveTo(reachableTiles);

            await service.updateReachableTiles();

            expect(service.canTravelToTile(TEST_REACHABLE_TILES[0].x, TEST_REACHABLE_TILES[0].y)).toBeTrue();
            expect(service.canTravelToTile(TEST_REACHABLE_TILES[1].x, TEST_REACHABLE_TILES[1].y)).toBeTrue();
        });

        it('should return false if tile is not in reachableTiles', async () => {
            gameStateServiceMock.getAccessibleTiles.and.resolveTo(TEST_REACHABLE_TILES);

            await service.updateReachableTiles();

            expect(service.canTravelToTile(TEST_UNREACHABLE_TILE.x, TEST_UNREACHABLE_TILE.y)).toBeFalse();
        });
    });

    describe('updateReachableTiles', () => {
        it('should update reachable tiles successfully', async () => {
            const gameId = 'test-game-id';

            service.setGameId(gameId);
            gameStateServiceMock.getAccessibleTiles.and.resolveTo(TEST_REACHABLE_TILES);

            await service.updateReachableTiles();

            expect(gameStateServiceMock.getAccessibleTiles).toHaveBeenCalledWith();
            expect(service.canTravelToTile(TEST_REACHABLE_TILES[0].x, TEST_REACHABLE_TILES[0].y)).toBeTrue();
            expect(service.canTravelToTile(TEST_REACHABLE_TILES[1].x, TEST_REACHABLE_TILES[1].y)).toBeTrue();
        });

        it('should set empty reachable tiles on error', async () => {
            service.setGameId('test-game-id');
            gameStateServiceMock.getAccessibleTiles.and.rejectWith(new Error('Test error'));

            await service.updateReachableTiles();

            expect(service.canTravelToTile(TEST_REACHABLE_TILES[0].x, TEST_REACHABLE_TILES[0].y)).toBeFalse();
        });
    });

    describe('updateDoor', () => {
        beforeEach(() => {
            service.tiles = [
                [{ tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false }],
                [{ tileType: 'door', material: './assets/door.png', isSpawnPoint: false }],
            ];
            spyOn(service, 'updateReachableTiles').and.returnValue(Promise.resolve());
        });
        it('should change closed door to open door', () => {
            const doorCoordinate = { x: 0, y: 1 };
            service.updateDoor(doorCoordinate);

            expect(service.tiles[1][0].material).toBe('./assets/open_door.png');
            expect(service.updateReachableTiles).toHaveBeenCalled();
        });

        it('should change open door to closed door', () => {
            const doorCoordinate = { x: 0, y: 1 };
            service.tiles[1][0].material = './assets/open_door.png';

            service.updateDoor(doorCoordinate);

            expect(service.tiles[1][0].material).toBe('./assets/door.png');
            expect(service.updateReachableTiles).toHaveBeenCalled();
        });

        it('should keep the same material for non-door tiles', () => {
            const floorCoordinate = { x: 0, y: 0 };
            const originalMaterial = './assets/floor.png';

            service.updateDoor(floorCoordinate);

            expect(service.tiles[0][0].material).toBe(originalMaterial);
            expect(service.updateReachableTiles).toHaveBeenCalled();
        });
    });

    describe('getShortestPathToTile', () => {
        it('should return shortest path successfully', async () => {
            const gameId = 'test-game-id';
            const playerId = 'test-player-id';

            service.setGameId(gameId);
            service.setPlayerId(playerId);
            gameStateServiceMock.getShortestPathToTile.and.resolveTo({ path: TEST_PATH, firstItemOnPath: undefined });

            const result = await service.getShortestPathToTile(TEST_TARGET_TILE);

            expect(gameStateServiceMock.getShortestPathToTile).toHaveBeenCalledWith(gameId, playerId, TEST_TARGET_TILE);
            expect(result.path).toEqual(TEST_PATH);
        });

        it('should return empty array on error', async () => {
            const gameId = 'test-game-id';
            const playerId = 'test-player-id';

            service.setGameId(gameId);
            service.setPlayerId(playerId);
            gameStateServiceMock.getShortestPathToTile.and.rejectWith(new Error('Test error'));

            const result = await service.getShortestPathToTile(TEST_TARGET_TILE);

            expect(result.path).toEqual([]);
        });
    });

    describe('openDoor', () => {
        it('should call gameStateService.useDoor', async () => {
            const doorCoordinate = { x: 0, y: 1 };
            gameStateServiceMock.useDoor.and.resolveTo();
            await service.openDoor(doorCoordinate);
            expect(gameStateServiceMock.useDoor).toHaveBeenCalledWith(doorCoordinate);
        });
    });

    describe('updateWall', () => {
        beforeEach(() => {
            service.tiles = [
                [
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
                ],
                [
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
                ],
            ];
            service.size = 2;
            spyOn(service, 'updateReachableTiles').and.returnValue(Promise.resolve());
        });

        it('should change wall to grass (lighter) for odd sum of coordinates', () => {
            const wallCoordinate = { x: 0, y: 1 };

            service.updateWall(wallCoordinate);

            expect(service.tiles[1][0].material).toBe(TILE_IMAGE_URLS[TileMaterial.GrassLighter]);
            expect(service.tiles[1][0].tileType).toBe(TileType.Terrain);
            expect(service.updateReachableTiles).toHaveBeenCalled();
        });

        it('should change wall to grass for even sum of coordinates', () => {
            const wallCoordinate = { x: 1, y: 1 };

            service.updateWall(wallCoordinate);

            expect(service.tiles[1][1].material).toBe(TILE_IMAGE_URLS[TileMaterial.Grass]);
            expect(service.tiles[1][1].tileType).toBe(TileType.Terrain);
            expect(service.updateReachableTiles).toHaveBeenCalled();
        });
    });

    describe('reset', () => {
        it('should reset all public service properties to their default values', () => {
            service.gameId = 'test-game-id';
            service.setPlayerId('test-player-id');
            const mockTile = { tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false };
            service.tiles = [
                [mockTile, mockTile],
                [mockTile, mockTile],
            ];
            service.size = 2;
            service.reset();
            expect(service.gameId).toBe('');
            expect(service.tiles).toEqual([[]]);
            expect(service.size).toBe(0);
            expect(service.getGameId()).toBe('');
            expect(service.getTiles()).toEqual([[]]);
            expect(service.getSize()).toBe('(0x0)');
        });
    });

    describe('setItems', () => {
        it('should set items correctly', () => {
            const testItems = new Set<GameItem>([
                { item: GameObjects.Armor, position: { x: 1, y: 2 } },
                { item: GameObjects.Shield, position: { x: 3, y: 4 } },
            ]);

            service.setItems(testItems);

            expect(service.items).toEqual(testItems);
            expect(service.itemToShowAtPosition({ x: 1, y: 2 })).toEqual({ item: GameObjects.Armor, position: { x: 1, y: 2 } });
            expect(service.itemToShowAtPosition({ x: 3, y: 4 })).toEqual({ item: GameObjects.Shield, position: { x: 3, y: 4 } });
        });
    });

    describe('getReachableAreaPath', () => {
        beforeEach(() => {
            service.size = 3;
            spyOn(service, 'canTravelToTile').and.callFake((x, y) => {
                return x === y;
            });
        });

        it('should return coordinates of all reachable tiles', () => {
            const result = service.getReachableAreaPath();

            expect(result).toEqual([
                { x: 0, y: 0 },
                { x: 1, y: 1 },
                { x: 2, y: 2 },
            ]);
        });

        it('should return empty array when no tiles are reachable', () => {
            (service.canTravelToTile as jasmine.Spy).and.returnValue(false);

            const result = service.getReachableAreaPath();

            expect(result).toEqual([]);
        });
    });

    describe('breakWall', () => {
        it('should call gameStateService.breakWall with correct coordinates', async () => {
            const wallCoordinate = { x: 2, y: 3 };
            gameStateServiceMock.breakWall = jasmine.createSpy('breakWall').and.resolveTo();

            await service.breakWall(wallCoordinate);

            expect(gameStateServiceMock.breakWall).toHaveBeenCalledWith(wallCoordinate);
        });
    });

    describe('getTileAt', () => {
        beforeEach(() => {
            service.tiles = [
                [
                    { tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
                ],
                [
                    { tileType: 'door', material: './assets/door.png', isSpawnPoint: false },
                    { tileType: 'terrain', material: './assets/grass.png', isSpawnPoint: true },
                ],
            ];
        });

        it('should return the tile at the specified position', () => {
            const position = { x: 1, y: 0 };
            const expectedTile = { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false };

            const result = service.getTileAt(position);

            expect(result).toEqual(expectedTile);
        });

        it('should return undefined if coordinates are out of bounds', () => {
            const position = { x: 5, y: 5 };

            const result = service.getTileAt(position);

            expect(result).toBeUndefined();
        });

        it('should return undefined if position is undefined', () => {
            const result = service.getTileAt(undefined);

            expect(result).toBeUndefined();
        });
    });

    describe('getTileDescription', () => {
        beforeEach(() => {
            service.tiles = [
                [
                    { tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: true },
                ],
            ];
        });

        it('should return player name and champion when player is at position and connected', () => {
            const players = [{ name: 'TestPlayer', championName: 'Warrior', position: { x: 0, y: 0 }, isConnected: true } as Player];

            const result = service.getTileDescription(service.tiles[0][0], 0, 0, players);

            expect(result).toBe('TestPlayer\n(Warrior)');
        });

        it('should return item name and description when an item is at position', () => {
            const players = [{ position: { x: 5, y: 5 }, isConnected: true } as Player];
            const testItem = { item: GameObjects.Armor, position: { x: 0, y: 0 } };
            spyOn(service, 'itemToShowAtPosition').and.returnValue(testItem);

            const result = service.getTileDescription(service.tiles[0][0], 0, 0, players);

            expect(result).toContain(ITEM_DISPLAY_NAMES[GameObjects.Armor]);
            expect(result).toContain(ITEM_DESCRIPTION_MAP[GameObjects.Armor]);
        });

        it('should return "Point de départ" for spawn points with connected players', () => {
            const players = [
                {
                    name: 'TestPlayer',
                    championName: 'Warrior',
                    position: { x: 3, y: 3 },
                    spawnPointPosition: { x: 1, y: 0 },
                    isConnected: true,
                } as Player,
            ];

            spyOn(service, 'itemToShowAtPosition').and.returnValue(undefined);

            service.tiles[0][1].isSpawnPoint = true;

            const result = service.getTileDescription(service.tiles[0][1], 1, 0, players);

            expect(result).toBe('Point de départ');
        });

        it('should return tile type info when no special conditions apply', () => {
            const players: Player[] = [];
            spyOn(service, 'itemToShowAtPosition').and.returnValue(undefined);
            spyOn(service, 'shouldShowSpawnPoint').and.returnValue(false);

            const result = service.getTileDescription(service.tiles[0][0], 0, 0, players);

            expect(result).toContain('Type:');
        });
    });

    describe('itemToShowAtPosition', () => {
        beforeEach(() => {
            const testItems = new Set<GameItem>([
                { item: GameObjects.Armor, position: { x: 1, y: 2 } },
                { item: GameObjects.Shield, position: { x: 3, y: 4 } },
            ]);
            service.setItems(testItems);
        });

        it('should return the item at the specified position', () => {
            const result = service.itemToShowAtPosition({ x: 1, y: 2 });
            expect(result).toEqual({ item: GameObjects.Armor, position: { x: 1, y: 2 } });
        });

        it('should return undefined when no item exists at the position', () => {
            const result = service.itemToShowAtPosition({ x: 5, y: 5 });
            expect(result).toBeUndefined();
        });
    });

    describe('shouldShowSpawnPoint', () => {
        beforeEach(() => {
            service.tiles = [
                [
                    { tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: true },
                ],
                [
                    { tileType: 'door', material: './assets/door.png', isSpawnPoint: false },
                    { tileType: 'terrain', material: './assets/grass.png', isSpawnPoint: true },
                ],
            ];
        });

        it('should return false if the tile is not a spawn point', () => {
            const result = service.shouldShowSpawnPoint(0, 0, [
                {
                    name: 'TestPlayer',
                    spawnPointPosition: { x: 1, y: 0 },
                    isConnected: true,
                } as Player,
            ]);

            expect(result).toBe(false);
        });

        it('should return false if no player has this spawn point', () => {
            const result = service.shouldShowSpawnPoint(1, 0, [
                {
                    name: 'TestPlayer',
                    spawnPointPosition: { x: 1, y: 1 },
                    isConnected: true,
                } as Player,
            ]);

            expect(result).toBe(false);
        });

        it('should return false if player with this spawn is not connected', () => {
            const result = service.shouldShowSpawnPoint(1, 0, [
                {
                    name: 'TestPlayer',
                    spawnPointPosition: { x: 1, y: 0 },
                    isConnected: false,
                } as Player,
            ]);

            expect(result).toBe(false);
        });

        it('should return true if player has this spawn point and is connected', () => {
            const result = service.shouldShowSpawnPoint(1, 0, [
                {
                    name: 'TestPlayer',
                    spawnPointPosition: { x: 1, y: 0 },
                    isConnected: true,
                } as Player,
            ]);

            expect(result).toBe(true);
        });
    });
    describe('getTileDescription', () => {
        beforeEach(() => {
            service.tiles = [
                [
                    { tileType: 'floor', material: './assets/floor.png', isSpawnPoint: false },
                    { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: true },
                ],
            ];
        });

        it('should return proper description for known tile materials', () => {
            const players: Player[] = [];
            spyOn(service, 'itemToShowAtPosition').and.returnValue(undefined);
            spyOn(service, 'shouldShowSpawnPoint').and.returnValue(false);

            const knownTile = {
                tileType: 'wall',
                material: './assets/wall.png',
                isSpawnPoint: false,
            };

            const result = service.getTileDescription(knownTile, 0, 0, players);

            expect(result).toBe('Type: Mur\nBloque le passage');
        });

        it('should handle unknown tile materials by returning default description', () => {
            const players: Player[] = [];
            spyOn(service, 'itemToShowAtPosition').and.returnValue(undefined);
            spyOn(service, 'shouldShowSpawnPoint').and.returnValue(false);

            const unknownTile = {
                tileType: 'unknown',
                material: './assets/nonexistent-material.png',
                isSpawnPoint: false,
            };

            const result = service.getTileDescription(unknownTile, 0, 0, players);

            expect(result).toBe('Type: Default');
        });
    });
});
