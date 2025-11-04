/* eslint-disable @typescript-eslint/no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { DragDropModule } from '@angular/cdk/drag-drop';
import { CommonModule } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { SaveLevelDialogComponent } from '@app/components/editor-view-page-components/save-level-dialog/save-level-dialog.component';
import { NON_EXISTANT_GAME_ID, SMALL_GRID_INFO } from '@app/constants/client-constants';
import { getFakeGameInfo } from '@app/constants/fake-game-info';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { GridStateService } from '@app/services/grid-state/grid-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { ThumbnailGeneratorService } from '@app/services/thumbail-generator/thumbnail-generator.service';
import { ToolStateService } from '@app/services/tool-state/tool-state.service';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { GameInfo } from '@common/game/game-info';
import { BehaviorSubject, Subject, of, throwError } from 'rxjs';
import { EditorToolbarComponent } from './editor-toolbar.component';

describe('EditorToolbarComponent', () => {
    let component: EditorToolbarComponent;
    let fixture: ComponentFixture<EditorToolbarComponent>;
    let thumbnailGeneratorServiceMock: jasmine.SpyObj<ThumbnailGeneratorService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;
    let snackBarServiceMock: jasmine.SpyObj<SnackBarService>;
    let game: jasmine.SpyObj<GameService>;
    let toolState: jasmine.SpyObj<ToolStateService>;
    let gridState: jasmine.SpyObj<GridStateService>;
    let formData: jasmine.SpyObj<FormDataService>;

    const mockSpawnPoints$ = new BehaviorSubject<number | null>(5);
    const mockRandomItems$ = new BehaviorSubject<number | null>(5);
    const mockFlags$ = new BehaviorSubject<number | null>(2);
    const mockReset$ = new Subject<void>();

    const mockGameInfo = getFakeGameInfo();

    beforeEach(async () => {
        thumbnailGeneratorServiceMock = jasmine.createSpyObj('ThumbnailGeneratorService', ['generateGridImage']);
        thumbnailGeneratorServiceMock.generateGridImage.and.returnValue(Promise.resolve('data:image/png;base64,abc'));

        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
        dialogMock.open.and.returnValue({} as MatDialogRef<SaveLevelDialogComponent>);

        snackBarServiceMock = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);

        game = jasmine.createSpyObj('GameService', ['getGameById', 'createGame', 'updateGame']);
        game.getGameById.and.returnValue(of(mockGameInfo));
        game.createGame.and.returnValue(of(mockGameInfo));
        game.updateGame.and.returnValue(of(mockGameInfo));

        toolState = jasmine.createSpyObj('ToolStateService', [
            'setCurrentlyDragging',
            'getCurrentlyDragging',
            'getActiveTool',
            'setActiveTool',
            'placeItem',
        ]);

        gridState = jasmine.createSpyObj('GridStateService', [
            'setGridData',
            'setOriginalGridData',
            'setRandomItems',
            'setSpawnpointsToPlace',
            'setFlags',
            'canPlaceSpawnpoint',
            'canPlaceFlag',
            'canPlaceItem',
            'placeSpawnpoint',
            'deleteSpawnpoint',
            'getOriginalGridData',
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
        ]);

        gridState.canPlaceItem.and.returnValue(true);

        Object.defineProperties(gridState, {
            spawnPoints$: { get: () => mockSpawnPoints$ },
            randomItems$: { get: () => mockRandomItems$ },
            flagSubject: { get: () => mockFlags$ },
            flags$: { get: () => mockFlags$.asObservable() },
            reset$: { get: () => mockReset$ },
            items: { value: [] },
        });

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
            imports: [CommonModule, DragDropModule, FormsModule, EditorToolbarComponent],
            providers: [
                { provide: FormDataService, useValue: formData },
                { provide: ToolStateService, useValue: toolState },
                { provide: GameService, useValue: game },
                { provide: GridStateService, useValue: gridState },
                { provide: ThumbnailGeneratorService, useValue: thumbnailGeneratorServiceMock },
                { provide: MatDialog, useValue: dialogMock },
                { provide: SnackBarService, useValue: snackBarServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorToolbarComponent);
        component = fixture.componentInstance;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with correct form data', () => {
        expect(formData.getId()).toBe(NON_EXISTANT_GAME_ID);
        expect(formData.getFormData().size).toBe(SMALL_GRID_INFO.size);
    });

    describe('ngOnInit', () => {
        it('should set edit info from form if game does not exist', () => {
            component.ngOnInit();
            expect(component.title).toBe('Test Game');
            expect(component.description).toBe('Test Description');
        });

        it('should set edit info from existing game if game exists', () => {
            formData.getId.and.returnValue('existing-id');
            component.ngOnInit();
            expect(game.getGameById).toHaveBeenCalledWith('existing-id');
        });

        it('should subscribe to spawnPoints$ and randomItems$', () => {
            component.ngOnInit();
            mockSpawnPoints$.next(3);
            mockRandomItems$.next(4);
            expect(component.spawnPoints).toBe(3);
            expect(component.randomItems).toBe(4);
        });

        it('should set CTF mode correctly', () => {
            formData.getFormData.and.returnValue({
                name: 'Test Game',
                description: 'Test Description',
                size: SMALL_GRID_INFO.size,
                mode: GameModes.CTF,
            });
            component.ngOnInit();
            expect(component.isCaptureTheFlagMode).toBeTrue();
        });
    });

    it('should unsubscribe on destroy', () => {
        spyOn(component['destroy$'], 'next');
        spyOn(component['destroy$'], 'complete');
        component.ngOnDestroy();
        expect(component['destroy$'].next).toHaveBeenCalled();
        expect(component['destroy$'].complete).toHaveBeenCalled();
    });

    describe('canPlaceItem', () => {
        it('should call gridState.canPlaceItem', () => {
            component.canPlaceItem(GameObjects.Armor);
            expect(gridState.canPlaceItem).toHaveBeenCalledWith(GameObjects.Armor);
        });

        it('should return result from gridState.canPlaceItem', () => {
            gridState.canPlaceItem.and.returnValue(false);
            expect(component.canPlaceItem(GameObjects.Armor)).toBeFalse();

            gridState.canPlaceItem.and.returnValue(true);
            expect(component.canPlaceItem(GameObjects.Armor)).toBeTrue();
        });
    });

    describe('setEditInfoFromForm', () => {
        it('should set title and description from form data', () => {
            component.setEditInfoFromForm();
            expect(component.title).toBe('Test Game');
            expect(component.description).toBe('Test Description');
            expect(gridState.setSize).toHaveBeenCalled();
            expect(gridState.setGameMode).toHaveBeenCalledWith(GameModes.Classic);
            expect(gridState.setTitle).toHaveBeenCalledWith('Test Game');
            expect(gridState.setDescription).toHaveBeenCalledWith('Test Description');
        });

        it('should set grid size using SIZE_TO_STRING mapping', () => {
            formData.getFormData.and.returnValue({
                name: 'Test Game',
                description: 'Test Description',
                size: 15,
                mode: GameModes.Classic,
            });
            component.setEditInfoFromForm();
            expect(gridState.setSize).toHaveBeenCalledWith('medium');
        });

        it('should use default size "small" when mapping fails', () => {
            formData.getFormData.and.returnValue({
                name: 'Test Game',
                description: 'Test Description',
                size: 100,
                mode: GameModes.Classic,
            });

            component.setEditInfoFromForm();

            expect(gridState.setSize).toHaveBeenCalledWith('small');
        });
    });

    it('setEditInfoFromExistingGame should set title and description from existing game', () => {
        const gameInfo: GameInfo = getFakeGameInfo();
        component.setEditInfoFromExistingGame(gameInfo);
        expect(component.title).toBe(gameInfo.name);
        expect(component.description).toBe(gameInfo.description);
        expect(gridState.setSize).toHaveBeenCalledWith(gameInfo.gameGrid.size);
        expect(gridState.setGameMode).toHaveBeenCalledWith(gameInfo.gameMode);
    });

    describe('Tool Selection', () => {
        it('should select tile and update active tool', () => {
            const tool = { type: 'wall', isActive: false, image: 'wall.png', description: 'walls desc', nameDisplay: 'mur' };
            component.selectTile(tool);
            expect(tool.isActive).toBeTrue();
            expect(toolState.setActiveTool).toHaveBeenCalledWith('wall');
        });
    });

    describe('Reset Mode', () => {
        it('should reset title and description', () => {
            component.onResetClick();
            expect(component.title).toBe('Test Title');
            expect(component.description).toBe('Test Description');
            expect(gridState.triggerReset).toHaveBeenCalled();
        });
    });

    describe('Drag and Drop', () => {
        it('should set currently dragging to true on drag start', () => {
            component.onDragStart();
            expect(toolState.setCurrentlyDragging).toHaveBeenCalledWith(true);
        });

        it('should reset drag and stop dragging on drag end', () => {
            const mockEvent = {
                source: {
                    _dragRef: { reset: jasmine.createSpy() },
                    data: { type: GameObjects.Armor },
                },
            };
            component.onDragEnd(mockEvent as any);
            expect(mockEvent.source._dragRef.reset).toHaveBeenCalled();
            expect(toolState.setCurrentlyDragging).toHaveBeenCalledWith(false);
            expect(toolState.placeItem).toHaveBeenCalledWith(GameObjects.Armor);
        });

        it('should not call placeItem if item type is None', () => {
            const mockEvent = {
                source: {
                    _dragRef: { reset: jasmine.createSpy() },
                    data: { type: GameObjects.None },
                },
            };
            component.onDragEnd(mockEvent as any);
            expect(toolState.placeItem).not.toHaveBeenCalled();
        });
    });

    describe('Game Creation', () => {
        it('should create new game successfully', async () => {
            await component.onCreateClick();
            expect(thumbnailGeneratorServiceMock.generateGridImage).toHaveBeenCalled();
            expect(game.createGame).toHaveBeenCalled();
            expect(dialogMock.open).toHaveBeenCalledWith(SaveLevelDialogComponent);
        });

        it('should handle create game error', async () => {
            game.createGame.and.returnValue(throwError(() => new Error('Create failed')));
            await component.onCreateClick();
            expect(snackBarServiceMock.showSnackBar).toHaveBeenCalledWith('Create failed');
        });
    });

    describe('when updating an existing game', () => {
        beforeEach(() => {
            component['gameId'] = 'existingGameId';
        });

        it('should update existing game successfully', async () => {
            await component.onCreateClick();
            expect(game.getGameById).toHaveBeenCalledWith('existingGameId');
            expect(game.updateGame).toHaveBeenCalled();
            expect(dialogMock.open).toHaveBeenCalledWith(SaveLevelDialogComponent);
        });

        it('should handle update game error', async () => {
            game.updateGame.and.returnValue(throwError(() => new Error('Update failed')));
            await component.onCreateClick();
            expect(snackBarServiceMock.showSnackBar).toHaveBeenCalledWith('Update failed');
        });

        it('should handle error fetching game during update and switch to create', async () => {
            game.getGameById.and.returnValue(throwError(() => new Error('Game not found')));
            await component.onCreateClick();
            expect(component['gameId']).toBe(NON_EXISTANT_GAME_ID);
            expect(game.createGame).toHaveBeenCalled();
        });
    });

    describe('Title and Description Management', () => {
        it('should update title when updateTitle is called', () => {
            const newTitle = 'Updated Test Title';
            component.updateTitle(newTitle);
            expect(component.title).toBe(newTitle);
        });

        it('should update description when updateDescription is called', () => {
            const newDescription = 'Updated Test Description';
            component.updateDescription(newDescription);
            expect(component.description).toBe(newDescription);
        });

        it('should reset title and description when onResetClick is called', () => {
            component.title = 'Different Title';
            component.description = 'Different Description';

            component.onResetClick();

            expect(component.title).toBe('Test Title');
            expect(component.description).toBe('Test Description');
        });
    });
});
