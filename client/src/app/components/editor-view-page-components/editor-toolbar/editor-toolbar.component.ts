import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { SaveLevelDialogComponent } from '@app/components/editor-view-page-components/save-level-dialog/save-level-dialog.component';
// On doit utiliser lint ignore puisque cet import est trop long
// eslint-disable-next-line max-len
import { TitleDescriptionEditorComponent } from '@app/components/editor-view-page-components/title-description-editor/title-description-editor.component';
import { EditorTileComponent } from '@app/components/editor-view-page-components/editor-tile/editor-tile.component';
import {
    ITEM_DESCRIPTION_MAP,
    ITEM_DISPLAY_NAMES,
    ITEMS_TOOLBAR_TOOLTIPS,
    NON_EXISTANT_GAME_ID,
    SIZE_TO_STRING,
    TILES_TOOLBAR_TOOLTIPS,
} from '@app/constants/client-constants';
import { Tool } from '@app/interfaces/client-interfaces';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { GridStateService } from '@app/services/grid-state/grid-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { ThumbnailGeneratorService } from '@app/services/thumbail-generator/thumbnail-generator.service';
import { ToolStateService } from '@app/services/tool-state/tool-state.service';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { GameInfo, Tile } from '@common/game/game-info';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: 'app-editor-toolbar',
    imports: [CommonModule, DragDropModule, FormsModule, TitleDescriptionEditorComponent, EditorTileComponent],
    templateUrl: './editor-toolbar.component.html',
    styleUrl: './editor-toolbar.component.scss',
})
export class EditorToolbarComponent implements OnInit, OnDestroy {
    spawnPoints: number | null = null;
    randomItems: number | null = null;
    isCaptureTheFlagMode: boolean = false;

    title: string;
    description: string;

    gameObjectsEnum = GameObjects;

    readonly tilesToolbarTooltips = TILES_TOOLBAR_TOOLTIPS;
    readonly itemsToolbarTooltips = ITEMS_TOOLBAR_TOOLTIPS;
    readonly itemDescriptionMap = ITEM_DESCRIPTION_MAP;
    readonly itemDisplayNames = ITEM_DISPLAY_NAMES;

    private gameId: string;
    private destroy$ = new Subject<void>();

    private snackBarService = inject(SnackBarService);
    private dialog = inject(MatDialog);
    private thumbnailGeneratorService = inject(ThumbnailGeneratorService);

    constructor(
        private formData: FormDataService,
        private toolState: ToolStateService,
        private game: GameService,
        private gridState: GridStateService,
    ) {}

    ngOnInit(): void {
        this.gameId = this.formData.getId();
        if (this.gameId === NON_EXISTANT_GAME_ID) {
            this.setEditInfoFromForm();
        } else {
            this.game.getGameById(this.gameId).subscribe({
                next: (fetchedGame) => {
                    this.setEditInfoFromExistingGame(fetchedGame);
                },
            });
        }
        this.gridState.spawnPoints$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
            this.spawnPoints = value;
        });
        this.gridState.randomItems$.pipe(takeUntil(this.destroy$)).subscribe((value) => {
            this.randomItems = value;
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    updateTitle(newTitle: string): void {
        this.title = newTitle;
    }

    updateDescription(newDescription: string): void {
        this.description = newDescription;
    }

    setEditInfoFromForm(): void {
        this.title = this.formData.getFormData().name;
        this.description = this.formData.getFormData().description;
        this.gridState.setSize(SIZE_TO_STRING.get(this.formData.getFormData().size) ?? 'small');
        const gameMode = this.formData.getFormData().mode as GameModes;
        this.gridState.setGameMode(gameMode);
        this.isCaptureTheFlagMode = gameMode === GameModes.CTF;
        this.gridState.setTitle(this.title);
        this.gridState.setDescription(this.description);
    }

    setEditInfoFromExistingGame(fetchedGame: GameInfo): void {
        this.title = fetchedGame.name;
        this.description = fetchedGame.description;
        this.gridState.setSize(fetchedGame.gameGrid.size);
        const gameMode = fetchedGame.gameMode;
        this.gridState.setGameMode(gameMode);
        this.isCaptureTheFlagMode = gameMode === GameModes.CTF;
        this.gridState.setTitle(this.title);
        this.gridState.setDescription(this.description);
    }

    selectTile(tool: Tool): void {
        TILES_TOOLBAR_TOOLTIPS.forEach((value) => {
            value.isActive = false;
        });
        tool.isActive = true;
        this.toolState.setActiveTool(tool.type);
    }

    onResetClick() {
        this.title = this.gridState.getTitle();
        this.description = this.gridState.getDescription();
        this.gridState.triggerReset();
    }

    canPlaceItem(itemType: GameObjects): boolean {
        return this.gridState.canPlaceItem(itemType);
    }

    onDragStart() {
        this.toolState.setCurrentlyDragging(true);
    }

    onDragEnd(event: { source: { _dragRef: { reset: () => void }; data: { type: GameObjects } } }) {
        event.source._dragRef.reset();

        const itemType = event.source.data.type;

        if (itemType !== GameObjects.None) {
            this.toolState.placeItem(itemType);
        }

        this.toolState.setCurrentlyDragging(false);
    }

    async onCreateClick() {
        const grid = this.gridState.getGridData();
        const thumbnail = await this.thumbnailGeneratorService.generateGridImage(grid, this.gridState.items);

        if (this.gameId === NON_EXISTANT_GAME_ID) {
            await this.createGame(grid, thumbnail);
        } else {
            await this.updateGame(grid, thumbnail);
        }
    }

    private async createGame(tiles: Tile[][], thumbnail: string) {
        this.game
            .createGame({
                name: this.title,
                description: this.description,
                gameMode: this.gridState.getGameMode() as GameModes,
                lastChange: new Date(),
                gameGrid: { tiles, size: this.gridState.getSize() },
                items: this.gridState.items,
                isHidden: true,
                thumbnail,
            })
            .subscribe({
                next: () => {
                    this.dialog.open(SaveLevelDialogComponent);
                },
                error: (err) => {
                    this.snackBarService.showSnackBar(err.message);
                },
            });
    }

    private async updateGame(tiles: Tile[][], thumbnail: string) {
        this.game.getGameById(this.gameId).subscribe({
            next: (fetchedGame) => {
                fetchedGame.name = this.title;
                fetchedGame.description = this.description;
                fetchedGame.gameGrid = { tiles, size: fetchedGame.gameGrid.size };
                fetchedGame.items = this.gridState.items;
                fetchedGame.lastChange = new Date();
                fetchedGame.thumbnail = thumbnail;
                fetchedGame.isHidden = true;
                this.game.updateGame(fetchedGame).subscribe({
                    next: () => {
                        this.dialog.open(SaveLevelDialogComponent);
                    },
                    error: (err) => {
                        this.snackBarService.showSnackBar(err.message);
                    },
                });
            },
            error: () => {
                this.gameId = NON_EXISTANT_GAME_ID;
                this.onCreateClick();
            },
        });
    }
}
