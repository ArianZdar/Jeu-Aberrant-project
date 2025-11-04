import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import {
    GRID_INFO_MAP,
    ITEM_DESCRIPTION_MAP,
    ITEM_DISPLAY_NAMES,
    ITEM_IMAGE_MAP,
    MouseClicks,
    NON_EXISTANT_GAME_ID,
    SIZE_MAP,
    SMALL_GRID_INFO,
} from '@app/constants/client-constants';
import { TilePosition } from '@app/interfaces/client-interfaces';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { GridStateService } from '@app/services/grid-state/grid-state.service';
import { ToolStateService } from '@app/services/tool-state/tool-state.service';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate, Tile, TILE_IMAGE_URLS, TILE_TYPES, TileMaterial, TileType } from '@common/game/game-info';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-grid',
    imports: [CommonModule, DragDropModule],
    templateUrl: './grid.component.html',
    styleUrls: ['./grid.component.scss'],
})
export class GridComponent implements OnInit, OnDestroy {
    tiles: Tile[][];
    size: number;
    gameObjectsEnum = GameObjects;
    itemImageMap = ITEM_IMAGE_MAP;
    itemDescriptionMap = ITEM_DESCRIPTION_MAP;
    itemDisplayNames = ITEM_DISPLAY_NAMES;
    private isLeftMouseDown: boolean = false;
    private isRightMouseDown: boolean = false;
    private destroy$ = new Subject<void>();

    constructor(
        private formData: FormDataService,
        private toolState: ToolStateService,
        private game: GameService,
        private gridState: GridStateService,
    ) {}

    ngOnInit(): void {
        if (this.formData.getId() === NON_EXISTANT_GAME_ID) {
            this.createNewGridFromForm();
        } else {
            this.getGameInfo();
        }
        this.gridState.reset$.pipe(takeUntil(this.destroy$)).subscribe(() => {
            this.resetGrid();
        });
    }

    ngOnDestroy(): void {
        this.gridState.reset();
        this.destroy$.next();
        this.destroy$.complete();
    }

    onMouseDown(event: MouseEvent, tile: Tile, x: number, y: number): void {
        if (event.button === MouseClicks.Left) {
            this.isLeftMouseDown = true;
            if (tile.isSpawnPoint || this.gridState.getItemAtPosition({ x, y }) !== GameObjects.None) {
                this.toolState.setCurrentlyDragging(true);
            } else {
                this.onTileClick(tile, x, y);
            }
        }
        if (event.button === MouseClicks.Right) {
            this.isRightMouseDown = true;
        }
    }

    onMouseUp(event: MouseEvent): void {
        if (event.button === MouseClicks.Left) {
            this.isLeftMouseDown = false;
            this.toolState.setCurrentlyDragging(false);
        }
        if (event.button === MouseClicks.Right) {
            this.isRightMouseDown = false;
        }
    }

    onMouseMove(tile: Tile, x: number, y: number): void {
        if (this.isTryingToPlaceTile(tile)) {
            this.placeTile(tile, x, y);
        }
        if (this.isRightMouseDown) {
            this.deleteTile(tile, x, y);
        }
    }

    onMouseLeave(): void {
        this.isLeftMouseDown = false;
        this.isRightMouseDown = false;
    }

    onMouseEnter(tile: Tile, x: number, y: number): void {
        const itemBeingPlaced = this.toolState.getItemBeingPlaced();
        if (this.toolState.getItemBeingPlaced() !== GameObjects.None && !this.toolState.getCurrentlyDragging()) {
            const canPlaceItemOnTile =
                !tile.isSpawnPoint &&
                tile.tileType !== TileType.Wall &&
                tile.tileType !== TileType.Door &&
                this.gridState.canPlaceItem(itemBeingPlaced);

            if (canPlaceItemOnTile) {
                if (itemBeingPlaced === GameObjects.Spawnpoint) {
                    tile.isSpawnPoint = true;
                }
                this.gridState.placeItem(itemBeingPlaced, { x, y });
            }
            this.toolState.placedItem();
        }
    }

    onRightClick(event: MouseEvent, tile: Tile, x: number, y: number): void {
        event.preventDefault();
        const item = this.gridState.getItemAtPosition({ x, y });
        if (tile.isSpawnPoint) {
            tile.isSpawnPoint = false;
            this.gridState.deleteItem(GameObjects.Spawnpoint);
        } else if (item !== GameObjects.None) {
            this.gridState.deleteItem(item, { x, y });
        } else {
            this.deleteTile(tile, x, y);
        }
    }

    getItemAtPosition(position: Coordinate): GameObjects {
        return this.gridState.getItemAtPosition(position);
    }

    drop(event: CdkDragDrop<TilePosition>) {
        const prevPos = event.item.data;
        const newPos = event.container.data;

        if (!prevPos || !newPos) return;

        const prevTile = this.tiles[prevPos.x][prevPos.y];
        const currTile = this.tiles[newPos.x][newPos.y];
        const item = this.gridState.getItemAtPosition({ x: prevPos.y, y: prevPos.x });

        if (!event.isPointerOverContainer) {
            if (prevTile.isSpawnPoint) {
                prevTile.isSpawnPoint = false;
                this.gridState.deleteItem(GameObjects.Spawnpoint);
            } else {
                this.gridState.deleteItem(item, { x: prevPos.y, y: prevPos.x });
            }
            return;
        }

        if (
            currTile.tileType === TileType.Wall ||
            currTile.tileType === TileType.Door ||
            currTile.isSpawnPoint ||
            this.gridState.getItemAtPosition({ x: newPos.y, y: newPos.x }) !== GameObjects.None
        ) {
            return;
        }
        if (prevTile.isSpawnPoint) {
            [prevTile.isSpawnPoint, currTile.isSpawnPoint] = [currTile.isSpawnPoint, prevTile.isSpawnPoint];
        } else {
            this.gridState.moveItem({ x: prevPos.y, y: prevPos.x }, { x: newPos.y, y: newPos.x });
        }
    }

    private getGameInfo() {
        this.game.getGameById(this.formData.getId()).subscribe({
            next: (game) => {
                const gridConfig = SIZE_MAP.get(game.gameGrid.size);
                this.size = gridConfig?.size ?? SMALL_GRID_INFO.size;
                this.tiles = game.gameGrid.tiles;
                this.gridState.setGridData(this.tiles);
                this.gridState.setOriginalGridData(structuredClone(this.tiles), structuredClone(game.items));
                this.gridState.setItems(game.items);
                const numberOfRandomItems = (GRID_INFO_MAP.get(this.size)?.numberOfPlaceable ?? 0) - this.gridState.getOriginalNumberOfGameItems();
                this.gridState.setRandomItems(numberOfRandomItems);
            },
        });
        this.gridState.setSpawnpointsToPlace(0);
    }

    private createNewGridFromForm() {
        const formData = this.formData.getFormData();
        this.size = formData.size;
        this.setNumberOfSpawnpointsAndItems();

        this.tiles = Array.from({ length: this.size }, (_, rowIndex) =>
            Array.from({ length: this.size }, (__, colIndex) => {
                const isLighterTile = (rowIndex + colIndex) % 2 !== 0;
                return {
                    tileType: TileType.Terrain,
                    material: isLighterTile ? TILE_IMAGE_URLS[TileMaterial.GrassLighter] : TILE_IMAGE_URLS[TileMaterial.Grass],
                    isSpawnPoint: false,
                };
            }),
        );

        this.gridState.setGridData(this.tiles);
        this.gridState.setOriginalGridData(structuredClone(this.tiles), []);
        const gridInfo = GRID_INFO_MAP.get(this.size) || SMALL_GRID_INFO;
        this.gridState.setSpawnpointsToPlace(gridInfo.numberOfPlaceable);
        this.gridState.setRandomItems(gridInfo.numberOfPlaceable);
    }

    private setNumberOfSpawnpointsAndItems(): void {
        const gridInfo = GRID_INFO_MAP.get(this.size) || SMALL_GRID_INFO;
        this.gridState.setSpawnpointsToPlace(gridInfo.numberOfPlaceable);
        this.gridState.setRandomItems(gridInfo.numberOfPlaceable);
    }

    private onTileClick(tile: Tile, x: number, y: number): void {
        const activeTool = this.toolState.getActiveTool();
        if (activeTool === TileMaterial.Door) {
            const doorStates = {
                [TILE_IMAGE_URLS[TileMaterial.Door]]: TILE_IMAGE_URLS[TileMaterial.OpenDoor],
                [TILE_IMAGE_URLS[TileMaterial.OpenDoor]]: TILE_IMAGE_URLS[TileMaterial.Door],
            };
            if (doorStates[tile.material]) {
                tile.material = doorStates[tile.material];
            } else {
                this.placeTile(tile, x, y);
            }
        } else {
            this.placeTile(tile, x, y);
        }
    }

    private deleteTile(tile: Tile, x: number, y: number): void {
        tile.tileType = TileType.Terrain;
        const isLighterTile = (y + x) % 2 === 0;
        tile.material = isLighterTile ? TILE_IMAGE_URLS[TileMaterial.Grass] : TILE_IMAGE_URLS[TileMaterial.GrassLighter];
    }

    private placeTile(tile: Tile, x: number, y: number): void {
        const activeTool = this.toolState.getActiveTool();
        if (activeTool === TileMaterial.Door || activeTool === TileMaterial.Wall) {
            if (tile.isSpawnPoint) {
                tile.isSpawnPoint = false;
                this.gridState.deleteItem(GameObjects.Spawnpoint);
            } else if (this.gridState.getItemAtPosition({ x, y }) !== GameObjects.None) {
                this.gridState.deleteItem(this.gridState.getItemAtPosition({ x, y }), { x, y });
            }
        }
        if (activeTool) {
            tile.tileType = TILE_TYPES[activeTool];
            tile.material = TILE_IMAGE_URLS[activeTool];
        }
    }

    private resetGrid(): void {
        this.tiles = structuredClone(this.gridState.getOriginalGridData());
        this.gridState.setGridData(this.tiles);
        this.gridState.setItems(structuredClone(this.gridState.getOriginalItems()));
        if (this.formData.getId() === NON_EXISTANT_GAME_ID) {
            this.setNumberOfSpawnpointsAndItems();
        } else {
            this.gridState.setSpawnpointsToPlace(0);
            const gridInfo = GRID_INFO_MAP.get(this.size) || SMALL_GRID_INFO;
            const numberOfRandomItems = gridInfo.numberOfPlaceable - this.gridState.getOriginalNumberOfGameItems();
            this.gridState.setRandomItems(numberOfRandomItems);
        }
    }

    private isTryingToPlaceTile(tile: Tile): boolean {
        return (
            this.isLeftMouseDown &&
            !this.toolState.getCurrentlyDragging() &&
            !(this.toolState.getActiveTool() === TileMaterial.Door && tile.tileType === TileType.Door)
        );
    }
}
