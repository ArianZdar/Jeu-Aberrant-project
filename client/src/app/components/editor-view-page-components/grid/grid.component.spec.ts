/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GRID_INFO_MAP, NON_EXISTANT_GAME_ID, SMALL_GRID_INFO } from '@app/constants/client-constants';
import { getFakeGameInfo } from '@app/constants/fake-game-info';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { GridStateService } from '@app/services/grid-state/grid-state.service';
import { ToolStateService } from '@app/services/tool-state/tool-state.service';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { Coordinate, Tile, TILE_IMAGE_URLS, TileMaterial, TileType } from '@common/game/game-info';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { GridComponent } from './grid.component';

describe('GridComponent', () => {
    let component: GridComponent;
    let fixture: ComponentFixture<GridComponent>;
    let game: jasmine.SpyObj<GameService>;
    let toolState: jasmine.SpyObj<ToolStateService>;
    let gridState: jasmine.SpyObj<GridStateService>;
    let formData: jasmine.SpyObj<FormDataService>;

    const mockSpawnPoints$ = new BehaviorSubject<number | null>(5);
    const mockRandomItems$ = new BehaviorSubject<number | null>(5);
    const mockReset$ = new Subject<void>();
    const mockGameInfo = getFakeGameInfo();

    beforeEach(async () => {
        game = jasmine.createSpyObj('GameService', ['getGameById', 'createGame', 'updateGame']);
        game.getGameById.and.returnValue(of(mockGameInfo));
        game.createGame.and.returnValue(of(mockGameInfo));
        game.updateGame.and.returnValue(of(mockGameInfo));

        toolState = jasmine.createSpyObj('ToolStateService', [
            'setCurrentlyDragging',
            'getCurrentlyDragging',
            'getActiveTool',
            'getItemBeingPlaced',
            'placedItem',
            'placeItem',
            'setActiveTool',
        ]);

        gridState = jasmine.createSpyObj('GridStateService', [
            'setGridData',
            'setOriginalGridData',
            'setRandomItems',
            'setSpawnpointsToPlace',
            'setFlags',
            'canPlaceItem',
            'placeItem',
            'deleteItem',
            'getItemAtPosition',
            'getOriginalGridData',
            'getOriginalItems',
            'getOriginalNumberOfGameItems',
            'setItems',
            'moveItem',
            'setSize',
            'setGameMode',
            'setTitle',
            'setDescription',
            'getSize',
            'getGameMode',
            'getTitle',
            'getDescription',
            'triggerReset',
            'getGridData',
            'reset',
        ]);

        Object.defineProperties(gridState, {
            spawnPoints$: { get: () => mockSpawnPoints$ },
            randomItems$: { get: () => mockRandomItems$ },
            reset$: { get: () => mockReset$ },
        });

        gridState.getItemAtPosition.and.returnValue(GameObjects.None);
        gridState.canPlaceItem.and.returnValue(true);
        gridState.getOriginalGridData.and.returnValue([
            [
                {
                    tileType: TileType.Terrain,
                    material: TILE_IMAGE_URLS[TileMaterial.Grass],
                    isSpawnPoint: false,
                },
            ],
        ]);
        gridState.getOriginalItems.and.returnValue([]);
        gridState.getOriginalNumberOfGameItems.and.returnValue(0);
        gridState.getTitle.and.returnValue('Test Title');
        gridState.getDescription.and.returnValue('Test Description');
        gridState.getSize.and.returnValue('medium');
        gridState.getGameMode.and.returnValue(GameModes.Classic);
        gridState.getGridData.and.returnValue([[]]);

        formData = jasmine.createSpyObj('FormDataService', ['getId', 'getFormData']);
        formData.getId.and.returnValue(NON_EXISTANT_GAME_ID);
        formData.getFormData.and.returnValue({
            name: 'Test Game',
            description: 'Test Description',
            size: SMALL_GRID_INFO.size,
            mode: GameModes.Classic,
        });

        await TestBed.configureTestingModule({
            imports: [CommonModule, DragDropModule, GridComponent],
            providers: [
                { provide: FormDataService, useValue: formData },
                { provide: ToolStateService, useValue: toolState },
                { provide: GameService, useValue: game },
                { provide: GridStateService, useValue: gridState },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GridComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create and initialize properly', () => {
        expect(component).toBeTruthy();
        component.ngOnInit();
        expect(component.tiles).toBeDefined();
        expect(gridState.setGridData).toHaveBeenCalled();
        formData.getId.and.returnValue('123');
        component.ngOnInit();
        expect(component.tiles).toBeDefined();
    });

    it('should handle grid reset scenarios', () => {
        mockReset$.next();
        expect(gridState.setGridData).toHaveBeenCalled();
        expect(gridState.setItems).toHaveBeenCalled();
        formData.getId.and.returnValue('123');
        component.ngOnInit();
        mockReset$.next();
        expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(0);
    });

    it('should handle undefined numberOfPlaceable when resetting grid', () => {
        formData.getId.and.returnValue('existing-game-id');
        component.ngOnInit();

        gridState.setRandomItems.calls.reset();

        gridState.getOriginalNumberOfGameItems.and.returnValue(0);

        spyOn(GRID_INFO_MAP, 'get').and.returnValue({
            numberOfPlaceable: 0,
            size: component.size,
        });

        mockReset$.next();

        expect(gridState.setRandomItems).toHaveBeenCalledWith(0);
    });

    it('should properly clean up on destroy', () => {
        spyOn(component['destroy$'], 'next');
        spyOn(component['destroy$'], 'complete');
        component.ngOnDestroy();
        expect(gridState.reset).toHaveBeenCalled();
        expect(component['destroy$'].next).toHaveBeenCalled();
        expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    describe('Tile Interaction Methods', () => {
        let tile: Tile;
        const x = 0;
        const y = 0;

        beforeEach(() => {
            tile = {
                tileType: TileType.Terrain,
                material: TILE_IMAGE_URLS[TileMaterial.Grass],
                isSpawnPoint: false,
            };
        });

        it('should handle door toggling on tile click', () => {
            const doorTile: Tile = {
                tileType: TileType.Door,
                material: TILE_IMAGE_URLS[TileMaterial.Door],
                isSpawnPoint: false,
            };
            toolState.getActiveTool.and.returnValue(TileMaterial.Door);
            component['onTileClick'](doorTile, x, y);
            expect(doorTile.material).toBe(TILE_IMAGE_URLS[TileMaterial.OpenDoor]);
        });

        it('should place tile and delete spawn point if present', () => {
            const spawnTile: Tile = {
                tileType: TileType.Terrain,
                material: TILE_IMAGE_URLS[TileMaterial.Grass],
                isSpawnPoint: true,
            };
            toolState.getActiveTool.and.returnValue(TileMaterial.Wall);
            component['placeTile'](spawnTile, x, y);
            expect(spawnTile.isSpawnPoint).toBeFalse();
            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Spawnpoint);
            expect(spawnTile.tileType).toBe(TileType.Wall);
        });

        it('should place tile and delete existing game item if present', () => {
            toolState.getActiveTool.and.returnValue(TileMaterial.Wall);
            gridState.getItemAtPosition.and.returnValue(GameObjects.Armor);
            component['placeTile'](tile, x, y);
            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Armor, { x, y });
            expect(tile.tileType).toBe(TileType.Wall);
        });
    });

    describe('Mouse Event Handlers', () => {
        let tile: Tile;
        const x = 0;
        const y = 0;

        beforeEach(() => {
            tile = {
                tileType: TileType.Terrain,
                material: TILE_IMAGE_URLS[TileMaterial.Grass],
                isSpawnPoint: false,
            };
        });

        it('should handle mouse down events correctly', () => {
            const leftClick = new MouseEvent('mousedown', { button: 0 });
            toolState.getActiveTool.and.returnValue(TileMaterial.Wall);
            component.onMouseDown(leftClick, tile, x, y);
            expect(component['isLeftMouseDown']).toBeTrue();
            expect(tile.tileType).toBe(TileType.Wall);

            const spawnPointTile = { ...tile, isSpawnPoint: true };
            component.onMouseDown(leftClick, spawnPointTile, x, y);
            expect(toolState.setCurrentlyDragging).toHaveBeenCalledWith(true);

            gridState.getItemAtPosition.and.returnValue(GameObjects.Armor);
            component.onMouseDown(leftClick, tile, x, y);
            expect(toolState.setCurrentlyDragging).toHaveBeenCalledWith(true);

            const rightClick = new MouseEvent('mousedown', { button: 2 });
            component.onMouseDown(rightClick, tile, x, y);
            expect(component['isRightMouseDown']).toBeTrue();
        });

        it('should handle mouse up events correctly', () => {
            component['isLeftMouseDown'] = true;
            const leftUp = new MouseEvent('mouseup', { button: 0 });
            component.onMouseUp(leftUp);
            expect(component['isLeftMouseDown']).toBeFalse();
            expect(toolState.setCurrentlyDragging).toHaveBeenCalledWith(false);

            component['isRightMouseDown'] = true;
            const rightUp = new MouseEvent('mouseup', { button: 2 });
            component.onMouseUp(rightUp);
            expect(component['isRightMouseDown']).toBeFalse();
        });

        it('should handle mouse movement and place tiles when dragging', () => {
            component['isLeftMouseDown'] = true;
            toolState.getCurrentlyDragging.and.returnValue(false);
            toolState.getActiveTool.and.returnValue(TileMaterial.Wall);
            component.onMouseMove(tile, x, y);
            expect(tile.tileType).toBe(TileType.Wall);
        });

        it('should not place tiles when dragging an item', () => {
            component['isLeftMouseDown'] = true;
            toolState.getCurrentlyDragging.and.returnValue(true);
            toolState.getActiveTool.and.returnValue(TileMaterial.Wall);
            const originalTile = { ...tile };
            component.onMouseMove(tile, x, y);
            expect(tile).toEqual(originalTile);
        });

        it('should delete tiles on right mouse down move', () => {
            component['isRightMouseDown'] = true;
            tile.tileType = TileType.Wall;
            component.onMouseMove(tile, x, y);
            expect(tile.tileType).toBe(TileType.Terrain);
            expect(tile.material).toBe(TILE_IMAGE_URLS[TileMaterial.Grass]);
        });

        it('should reset mouse state on mouse leave', () => {
            component['isLeftMouseDown'] = true;
            component['isRightMouseDown'] = true;
            component.onMouseLeave();
            expect(component['isLeftMouseDown']).toBeFalse();
            expect(component['isRightMouseDown']).toBeFalse();
        });

        it('should place item on mouse enter if item is being placed', () => {
            toolState.getItemBeingPlaced.and.returnValue(GameObjects.Armor);
            toolState.getCurrentlyDragging.and.returnValue(false);
            component.onMouseEnter(tile, x, y);
            expect(gridState.placeItem).toHaveBeenCalledWith(GameObjects.Armor, { x, y });
            expect(toolState.placedItem).toHaveBeenCalled();
        });

        it('should place spawn point on mouse enter if spawn point is being placed', () => {
            toolState.getItemBeingPlaced.and.returnValue(GameObjects.Spawnpoint);
            toolState.getCurrentlyDragging.and.returnValue(false);
            component.onMouseEnter(tile, x, y);
            expect(tile.isSpawnPoint).toBeTrue();
            expect(gridState.placeItem).toHaveBeenCalledWith(GameObjects.Spawnpoint, { x, y });
        });

        it('should not place item on wall or door tiles', () => {
            toolState.getItemBeingPlaced.and.returnValue(GameObjects.Armor);
            toolState.getCurrentlyDragging.and.returnValue(false);
            const wallTile = {
                tileType: TileType.Wall,
                material: TILE_IMAGE_URLS[TileMaterial.Wall],
                isSpawnPoint: false,
            };
            component.onMouseEnter(wallTile, x, y);
            expect(gridState.placeItem).not.toHaveBeenCalled();
        });

        it('should not place item on spawn point tiles', () => {
            toolState.getItemBeingPlaced.and.returnValue(GameObjects.Armor);
            toolState.getCurrentlyDragging.and.returnValue(false);
            const spawnTile = { ...tile, isSpawnPoint: true };
            component.onMouseEnter(spawnTile, x, y);
            expect(gridState.placeItem).not.toHaveBeenCalled();
        });

        it('should not place item if canPlaceItem returns false', () => {
            toolState.getItemBeingPlaced.and.returnValue(GameObjects.Armor);
            toolState.getCurrentlyDragging.and.returnValue(false);
            gridState.canPlaceItem.and.returnValue(false);
            component.onMouseEnter(tile, x, y);
            expect(gridState.placeItem).not.toHaveBeenCalled();
        });
    });

    describe('Right Click Handling', () => {
        let tile: Tile;
        const x = 0;
        const y = 0;

        beforeEach(() => {
            tile = {
                tileType: TileType.Terrain,
                material: TILE_IMAGE_URLS[TileMaterial.Grass],
                isSpawnPoint: false,
            };
        });

        it('should remove spawn point on right click', () => {
            const spawnPointTile = { ...tile, isSpawnPoint: true };
            const rightClick = new MouseEvent('contextmenu');
            const preventDefault = spyOn(rightClick, 'preventDefault');
            component.onRightClick(rightClick, spawnPointTile, x, y);
            expect(preventDefault).toHaveBeenCalled();
            expect(spawnPointTile.isSpawnPoint).toBeFalse();
            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Spawnpoint);
        });

        it('should remove item on right click', () => {
            gridState.getItemAtPosition.and.returnValue(GameObjects.Armor);
            const rightClick = new MouseEvent('contextmenu');
            spyOn(rightClick, 'preventDefault');
            component.onRightClick(rightClick, tile, x, y);
            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Armor, { x, y });
        });

        it('should reset tile to grass on right click if no item or spawn point', () => {
            tile.tileType = TileType.Wall;
            const rightClick = new MouseEvent('contextmenu');
            spyOn(rightClick, 'preventDefault');
            component.onRightClick(rightClick, tile, x, y);
            expect(tile.tileType).toBe(TileType.Terrain);
            expect(tile.material).toBe(TILE_IMAGE_URLS[TileMaterial.Grass]);
        });

        it('should set tile to darker grass when deleting a tile on darker positions', () => {
            const darkTile: Tile = {
                tileType: TileType.Wall,
                material: TILE_IMAGE_URLS[TileMaterial.Wall],
                isSpawnPoint: false,
            };
            component['deleteTile'](darkTile, x, y);
            expect(darkTile.tileType).toBe(TileType.Terrain);
            expect(darkTile.material).toBe(TILE_IMAGE_URLS[TileMaterial.Grass]);
        });

        it('should set tile to lighter grass when deleting a tile on lighter positions', () => {
            const lightTile: Tile = {
                tileType: TileType.Wall,
                material: TILE_IMAGE_URLS[TileMaterial.Wall],
                isSpawnPoint: false,
            };
            const lightX = 0;
            const lightY = 1;
            component['deleteTile'](lightTile, lightX, lightY);
            expect(lightTile.tileType).toBe(TileType.Terrain);
            expect(lightTile.material).toBe(TILE_IMAGE_URLS[TileMaterial.GrassLighter]);
        });
    });

    describe('Drag and Drop', () => {
        let dropEvent: CdkDragDrop<{ x: number; y: number; tileType: string }>;

        beforeEach(() => {
            component.tiles = Array.from({ length: 2 }, () =>
                Array.from({ length: 2 }, () => ({
                    tileType: TileType.Terrain,
                    material: TILE_IMAGE_URLS[TileMaterial.Grass],
                    isSpawnPoint: false,
                })),
            );

            dropEvent = {
                previousIndex: 0,
                currentIndex: 0,
                item: { data: { x: 0, y: 0, tileType: TileType.Terrain } },
                container: { data: { x: 1, y: 1, tileType: TileType.Terrain } },
                previousContainer: { data: { x: 0, y: 0, tileType: TileType.Terrain } },
                isPointerOverContainer: true,
                distance: { x: 0, y: 0 },
            } as CdkDragDrop<{ x: number; y: number; tileType: string }>;
        });

        it('should do nothing if event data is missing', () => {
            const nullDataEvent = {
                ...dropEvent,
                item: {
                    ...dropEvent.item,
                    data: null as unknown as { x: number; y: number; tileType: string },
                },
            } as CdkDragDrop<{ x: number; y: number; tileType: string }>;

            component.drop(nullDataEvent);
            expect(gridState.moveItem).not.toHaveBeenCalled();
        });

        it('should delete item if dropped outside container', () => {
            component.tiles[0][0].isSpawnPoint = true;
            dropEvent.isPointerOverContainer = false;

            component.drop(dropEvent);

            expect(component.tiles[0][0].isSpawnPoint).toBeFalse();
            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Spawnpoint);
        });

        it('should delete non-spawn item if dropped outside container', () => {
            gridState.getItemAtPosition.and.returnValue(GameObjects.Armor);
            dropEvent.isPointerOverContainer = false;

            component.drop(dropEvent);

            expect(gridState.deleteItem).toHaveBeenCalledWith(GameObjects.Armor, jasmine.any(Object));
        });

        it('should not move items to tiles that already have items or are walls', () => {
            component.tiles[1][1].tileType = TileType.Wall;
            component.drop(dropEvent);
            expect(gridState.moveItem).not.toHaveBeenCalled();

            component.tiles[1][1].tileType = TileType.Terrain;
            component.tiles[1][1].isSpawnPoint = true;
            component.drop(dropEvent);
            expect(gridState.moveItem).not.toHaveBeenCalled();

            component.tiles[1][1].isSpawnPoint = false;
            gridState.getItemAtPosition.and.returnValue(GameObjects.Shield);
            component.drop(dropEvent);
            expect(gridState.moveItem).not.toHaveBeenCalled();
        });

        it('should move spawn point when dragged to valid tile', () => {
            component.tiles[0][0].isSpawnPoint = true;
            component.tiles[1][1].tileType = TileType.Terrain;
            gridState.getItemAtPosition.and.returnValue(GameObjects.None);

            component.drop(dropEvent);

            expect(component.tiles[0][0].isSpawnPoint).toBeFalse();
            expect(component.tiles[1][1].isSpawnPoint).toBeTrue();
        });

        it('should move item when dragged to valid tile', () => {
            gridState.getItemAtPosition.and.callFake((pos: Coordinate) => {
                if (pos.x === 0 && pos.y === 0) return GameObjects.Shield;
                return GameObjects.None;
            });

            component.drop(dropEvent);

            expect(gridState.moveItem).toHaveBeenCalledWith({ x: 0, y: 0 }, { x: 1, y: 1 });
        });
    });

    describe('Grid Initialization', () => {
        it('should create a new grid with correct dimensions', () => {
            component['createNewGridFromForm']();
            expect(component.tiles.length).toBe(SMALL_GRID_INFO.size);
            expect(component.tiles[0].length).toBe(SMALL_GRID_INFO.size);
            expect(gridState.setGridData).toHaveBeenCalled();
            expect(gridState.setOriginalGridData).toHaveBeenCalled();
            expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
            expect(gridState.setRandomItems).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
        });

        it('should initialize from existing game data', () => {
            formData.getId.and.returnValue('existing-game');
            component['getGameInfo']();
            expect(game.getGameById).toHaveBeenCalledWith('existing-game');
            expect(gridState.setGridData).toHaveBeenCalled();
            expect(gridState.setOriginalGridData).toHaveBeenCalled();
            expect(gridState.setItems).toHaveBeenCalled();
        });

        it('should handle invalid size in game data', () => {
            const invalidSizeGameInfo = {
                ...mockGameInfo,
                gameGrid: { ...mockGameInfo.gameGrid, size: 'invalid_size' },
            };
            game.getGameById.and.returnValue(of(invalidSizeGameInfo));
            formData.getId.and.returnValue('existing-game');

            component['getGameInfo']();

            expect(component.size).toBe(SMALL_GRID_INFO.size);
        });

        it('should handle undefined numberOfPlaceable when getting game info', () => {
            const mockGridInfo = {
                size: SMALL_GRID_INFO.size,
            };

            spyOn(GRID_INFO_MAP, 'get').and.returnValue(mockGridInfo as any);

            formData.getId.and.returnValue('existing-game');

            component['getGameInfo']();

            expect(gridState.setRandomItems).toHaveBeenCalledWith(0 - gridState.getOriginalNumberOfGameItems());
            expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(0);
        });
    });

    it('should toggle door state when clicking on a door tile with door tool active', () => {
        const doorTile: Tile = {
            tileType: TileType.Door,
            material: TILE_IMAGE_URLS[TileMaterial.Door],
            isSpawnPoint: false,
        };
        toolState.getActiveTool.and.returnValue(TileMaterial.Door);
        component['onTileClick'](doorTile, 0, 0);
        expect(doorTile.material).toBe(TILE_IMAGE_URLS[TileMaterial.OpenDoor]);

        component['onTileClick'](doorTile, 0, 0);
        expect(doorTile.material).toBe(TILE_IMAGE_URLS[TileMaterial.Door]);
    });

    it('should place door when clicking on a non-door tile with door tool active', () => {
        const grassTile: Tile = {
            tileType: TileType.Terrain,
            material: TILE_IMAGE_URLS[TileMaterial.Grass],
            isSpawnPoint: false,
        };
        toolState.getActiveTool.and.returnValue(TileMaterial.Door);

        spyOn<any>(component, 'placeTile');

        component['onTileClick'](grassTile, 0, 0);

        expect(component['placeTile']).toHaveBeenCalledWith(grassTile, 0, 0);
    });

    it('should call placeTile when using non-door tools', () => {
        const grassTile: Tile = {
            tileType: TileType.Terrain,
            material: TILE_IMAGE_URLS[TileMaterial.Grass],
            isSpawnPoint: false,
        };
        toolState.getActiveTool.and.returnValue(TileMaterial.Wall);

        spyOn<any>(component, 'placeTile');

        component['onTileClick'](grassTile, 0, 0);

        expect(component['placeTile']).toHaveBeenCalledWith(grassTile, 0, 0);
    });

    it('should correctly handle tile with unknown material when door tool is active', () => {
        const unknownTile: Tile = {
            tileType: TileType.Terrain,
            material: 'unknown-material-url',
            isSpawnPoint: false,
        };
        toolState.getActiveTool.and.returnValue(TileMaterial.Door);

        spyOn<any>(component, 'placeTile');

        component['onTileClick'](unknownTile, 0, 0);

        expect(component['placeTile']).toHaveBeenCalledWith(unknownTile, 0, 0);
    });

    describe('Grid Configuration Fallback Tests', () => {
        it('should use SMALL_GRID_INFO when GRID_INFO_MAP.get returns undefined in createNewGridFromForm', () => {
            spyOn(GRID_INFO_MAP, 'get').and.returnValue(undefined);

            const mockFormData = {
                name: 'Test Game',
                description: 'Test Description',
                size: 999,
                mode: GameModes.Classic,
            };

            formData.getFormData.and.returnValue(mockFormData);

            component['createNewGridFromForm']();

            expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
            expect(gridState.setRandomItems).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
        });

        it('should use SMALL_GRID_INFO when GRID_INFO_MAP.get returns undefined in setNumberOfSpawnpointsAndItems', () => {
            spyOn(GRID_INFO_MAP, 'get').and.returnValue(undefined);

            component.size = 999;

            component['setNumberOfSpawnpointsAndItems']();

            expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
            expect(gridState.setRandomItems).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable);
        });
    });

    it('should not try to place tile when using door tool on existing door', () => {
        const doorTile: Tile = {
            tileType: TileType.Door,
            material: TILE_IMAGE_URLS[TileMaterial.Door],
            isSpawnPoint: false,
        };

        component['isLeftMouseDown'] = true;
        toolState.getCurrentlyDragging.and.returnValue(false);
        toolState.getActiveTool.and.returnValue(TileMaterial.Door);

        const result = (component as any).isTryingToPlaceTile(doorTile);

        expect(result).toBeFalse();

        const grassTile: Tile = {
            tileType: TileType.Terrain,
            material: TILE_IMAGE_URLS[TileMaterial.Grass],
            isSpawnPoint: false,
        };

        const resultForNonDoor = (component as any).isTryingToPlaceTile(grassTile);
        expect(resultForNonDoor).toBeTrue();
    });

    it('should use SMALL_GRID_INFO when GRID_INFO_MAP.get returns undefined in resetGrid', () => {
        formData.getId.and.returnValue('existing-game-id');
        component.ngOnInit();

        gridState.setRandomItems.calls.reset();
        gridState.setSpawnpointsToPlace.calls.reset();

        spyOn(GRID_INFO_MAP, 'get').and.returnValue(undefined);

        const originalItems = 2;
        gridState.getOriginalNumberOfGameItems.and.returnValue(originalItems);

        mockReset$.next();

        expect(gridState.setSpawnpointsToPlace).toHaveBeenCalledWith(0);
        expect(gridState.setRandomItems).toHaveBeenCalledWith(SMALL_GRID_INFO.numberOfPlaceable - originalItems);
    });
});
