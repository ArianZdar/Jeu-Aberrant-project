/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GameGridComponent } from '@app/components/game-page-components/game-grid/game-grid.component';
import { TILE_CENTER_OFFSET } from '@app/constants/client-constants';
import { mockFixedPlayer, mockGridTiles } from '@app/constants/mocks';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridEventsService } from '@app/services/game-grid-events/game-grid-events.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { GridContour } from '@app/services/grid-contour/grid-contour';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameObjects } from '@common/game/game-enums';
import { TileMaterial } from '@common/game/game-info';
import { BehaviorSubject } from 'rxjs';

describe('GameGridComponent', () => {
    let component: GameGridComponent;
    let fixture: ComponentFixture<GameGridComponent>;
    let gameGridServiceMock: jasmine.SpyObj<GameGridService>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let gridContourMock: jasmine.SpyObj<GridContour>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let gameGridEventsServiceMock: jasmine.SpyObj<GameGridEventsService>;
    let isDebugActiveSubject: BehaviorSubject<boolean>;
    let victoryMessageSubject: BehaviorSubject<{ winnerName: string; show: boolean } | null>;

    beforeEach(async () => {
        gameGridServiceMock = jasmine.createSpyObj('GameGridService', [
            'setTilesByGameId',
            'getTilesByGameId',
            'updateReachableTiles',
            'getTiles',
            'canTravelToTile',
            'getShortestPathToTile',
            'getGameId',
            'openDoor',
            'updateDoor',
            'breakWall',
            'itemToShowAtPosition',
            'getTileDescription',
            'shouldShowSpawnPoint',
            'getReachableAreaPath',
        ]);

        gameGridServiceMock.items = new Set([
            { position: { x: -1, y: -1 }, item: GameObjects.Armor },
            { position: { x: -1, y: -1 }, item: GameObjects.Bomb },
        ]);
        gameGridServiceMock.getTiles.and.returnValue(mockGridTiles);
        gameGridServiceMock.getGameId.and.returnValue('test-game-id');
        gameGridServiceMock.updateReachableTiles.and.resolveTo();
        gameGridServiceMock.itemToShowAtPosition.and.returnValue(undefined);
        gameGridServiceMock.getTileDescription.and.returnValue('Test description');
        gameGridServiceMock.shouldShowSpawnPoint.and.returnValue(true);
        gameGridServiceMock.getReachableAreaPath.and.returnValue([{ x: 1, y: 1 }]);

        playerServiceMock = jasmine.createSpyObj('PlayerService', [
            'setPlayers',
            'getPlayerAtPosition',
            'getMainPlayer',
            'getPlayers',
            'isPlayerConnectedAtPosition',
            'isMainPlayerAdjacent',
            'isCurrentPlayerTurn',
            'continueTurn',
            'animatePlayerMovement',
        ]);
        playerServiceMock.getPlayerAtPosition.and.returnValue(undefined);
        playerServiceMock.getMainPlayer.and.returnValue(mockFixedPlayer);
        playerServiceMock.getPlayers.and.returnValue([mockFixedPlayer]);
        playerServiceMock.isMainPlayerAdjacent.and.returnValue(true);
        playerServiceMock.isCurrentPlayerTurn = true;
        playerServiceMock.continueTurn.and.returnValue(true);
        playerServiceMock.animatePlayerMovement.and.resolveTo();

        gridContourMock = jasmine.createSpyObj('GridContour', ['getContourPath']);
        gridContourMock.getContourPath.and.returnValue('M0,0 L1,0 L1,1 Z');

        victoryMessageSubject = new BehaviorSubject<{ winnerName: string; show: boolean } | null>(null);

        combatServiceMock = jasmine.createSpyObj(
            'CombatService',
            ['getAttackModeValue', 'startCombat', 'setAttackMode', 'hideCombatVictoryMessage'],
            {
                combatVictoryMessage$: victoryMessageSubject.asObservable(),
            },
        );
        combatServiceMock.getAttackModeValue.and.returnValue(false);

        isDebugActiveSubject = new BehaviorSubject<boolean>(false);
        gameStateServiceMock = jasmine.createSpyObj('GameStateService', ['on', 'off', 'movePlayer', 'nextTurn']);
        gameStateServiceMock.isDebugActive$ = isDebugActiveSubject.asObservable();
        gameStateServiceMock.movePlayer.and.resolveTo(true);

        gameGridEventsServiceMock = jasmine.createSpyObj('GameGridEventsService', ['setupSocketListeners', 'removeSocketListeners']);

        await TestBed.configureTestingModule({
            imports: [GameGridComponent],
            providers: [
                { provide: GameGridService, useValue: gameGridServiceMock },
                { provide: PlayerService, useValue: playerServiceMock },
                { provide: GridContour, useValue: gridContourMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: GameGridEventsService, useValue: gameGridEventsServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameGridComponent);
        component = fixture.componentInstance;

        spyOn<any>(component, 'getShortestPathLine');
        spyOn<any>(component, 'moveToTile');
        spyOn<any>(component, 'showDescription');

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnChanges', () => {
        it('should initialize grid when initializationFinished becomes true', () => {
            const changes = {
                initializationFinished: {
                    currentValue: true,
                    previousValue: false,
                    firstChange: true,
                    isFirstChange: () => true,
                },
            };

            spyOn<any>(component, 'createGrid');
            spyOn<any>(component, 'setupSocketListeners');
            spyOn<any>(component, 'setupSubscriberListeners');

            component.ngOnChanges(changes);

            expect(component['createGrid']).toHaveBeenCalled();
            expect(component['setupSocketListeners']).toHaveBeenCalled();
            expect(component['setupSubscriberListeners']).toHaveBeenCalled();
            expect(gameGridServiceMock.updateReachableTiles).toHaveBeenCalled();
        });

        it('should not initialize grid when initializationFinished is false', () => {
            const changes = {
                initializationFinished: {
                    currentValue: false,
                    previousValue: false,
                    firstChange: true,
                    isFirstChange: () => true,
                },
            };

            spyOn<any>(component, 'createGrid');

            component.ngOnChanges(changes);

            expect(component['createGrid']).not.toHaveBeenCalled();
        });
    });

    describe('ngOnDestroy', () => {
        it('should remove socket listeners and complete the destroy$ subject', () => {
            spyOn<any>(component['destroy$'], 'next');
            spyOn<any>(component['destroy$'], 'complete');

            component.ngOnDestroy();

            expect(gameGridEventsServiceMock.removeSocketListeners).toHaveBeenCalled();
            expect(component['destroy$'].next).toHaveBeenCalled();
            expect(component['destroy$'].complete).toHaveBeenCalled();
        });
    });

    describe('getPlayerAtPosition', () => {
        it('should return player at the specified position', () => {
            const mockPlayer = { ...mockFixedPlayer };
            playerServiceMock.getPlayerAtPosition.and.returnValue(mockPlayer);

            const result = component.getPlayerAtPosition(1, 1);

            expect(playerServiceMock.getPlayerAtPosition).toHaveBeenCalledWith(1, 1);
            expect(result).toBe(mockPlayer);
        });

        it('should return undefined if no player at position', () => {
            playerServiceMock.getPlayerAtPosition.and.returnValue(undefined);

            const result = component.getPlayerAtPosition(5, 5);

            expect(playerServiceMock.getPlayerAtPosition).toHaveBeenCalledWith(5, 5);
            expect(result).toBeUndefined();
        });
    });

    describe('rightClickHandler', () => {
        let mockEvent: MouseEvent;

        beforeEach(() => {
            mockEvent = new MouseEvent('contextmenu');
            spyOn(mockEvent, 'preventDefault');
        });

        it('should prevent default and show description when not in debug mode', fakeAsync(() => {
            isDebugActiveSubject.next(false);
            const mockTile = mockGridTiles[0][0];
            const coordinate = { x: 0, y: 0 };

            component.rightClickHandler(mockEvent, mockTile, coordinate);
            tick();

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(component['moveToTile']).not.toHaveBeenCalled();
            expect(component['showDescription']).toHaveBeenCalledWith(mockEvent, mockTile);
        }));

        it('should teleport to tile when in debug mode', fakeAsync(() => {
            isDebugActiveSubject.next(true);
            const mockTile = mockGridTiles[0][0];
            const coordinate = { x: 0, y: 0 };

            component.rightClickHandler(mockEvent, mockTile, coordinate);
            tick();

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(component['moveToTile']).toHaveBeenCalledWith(coordinate, true);
            expect(component['showDescription']).not.toHaveBeenCalled();
        }));
    });

    describe('isAttackModeActive', () => {
        it('should delegate to combatService.getAttackModeValue', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(true);

            const result = component.isAttackModeActive();

            expect(combatServiceMock.getAttackModeValue).toHaveBeenCalled();
            expect(result).toBeTrue();
        });
    });

    describe('getTileDescription', () => {
        it('should get tile description from gameGridService', () => {
            const mockTile = mockGridTiles[0][0];
            gameGridServiceMock.getTileDescription.and.returnValue('Test description');

            const result = component.getTileDescription(mockTile, 0, 0);

            expect(gameGridServiceMock.getTileDescription).toHaveBeenCalledWith(mockTile, 0, 0, playerServiceMock.getPlayers());
            expect(result).toBe('Test description');
        });
    });

    describe('canTravelToTile', () => {
        it('should return false if not current player turn', () => {
            playerServiceMock.isCurrentPlayerTurn = false;

            const result = component.canTravelToTile(1, 2);

            expect(result).toBeFalse();
            expect(gameGridServiceMock.canTravelToTile).not.toHaveBeenCalled();
        });

        it('should delegate to gameGridService when it is current player turn', () => {
            playerServiceMock.isCurrentPlayerTurn = true;
            gameGridServiceMock.canTravelToTile.and.returnValue(true);

            const result = component.canTravelToTile(1, 2);

            expect(gameGridServiceMock.canTravelToTile).toHaveBeenCalledWith(1, 2);
            expect(result).toBeTrue();
        });
    });

    describe('shouldShowSpawnPoint', () => {
        it('should delegate to gameGridService', () => {
            gameGridServiceMock.shouldShowSpawnPoint.and.returnValue(true);

            const result = component.shouldShowSpawnPoint(1, 2);

            expect(gameGridServiceMock.shouldShowSpawnPoint).toHaveBeenCalledWith(1, 2, playerServiceMock.getPlayers());
            expect(result).toBeTrue();
        });
    });

    describe('itemToShowAtPosition', () => {
        it('should delegate to gameGridService', () => {
            const position = { x: 1, y: 2 };
            const mockItem = { position, item: GameObjects.Bomb };
            gameGridServiceMock.itemToShowAtPosition.and.returnValue(mockItem);

            const result = component.itemToShowAtPosition(position);

            expect(gameGridServiceMock.itemToShowAtPosition).toHaveBeenCalledWith(position);
            expect(result).toBe(mockItem);
        });
    });

    describe('hoverTile', () => {
        it('should clear shortestPath and get new path when tile is reachable', () => {
            gameGridServiceMock.canTravelToTile.and.returnValue(true);

            component.hoverTile(1, 2);

            expect(gameGridServiceMock.canTravelToTile).toHaveBeenCalledWith(1, 2);
            expect(component['getShortestPathLine']).toHaveBeenCalledWith({ x: 1, y: 2 });
        });

        it('should not get shortest path when tile is not reachable', () => {
            gameGridServiceMock.canTravelToTile.and.returnValue(false);

            component.hoverTile(1, 2);

            expect(gameGridServiceMock.canTravelToTile).toHaveBeenCalledWith(1, 2);
            expect(component['getShortestPathLine']).not.toHaveBeenCalled();
        });
    });

    describe('leaveGrid', () => {
        it('should clear description and shortestPath', () => {
            (component as any).showDescriptionFor = mockGridTiles[0][0];
            (component as any).shortestPath = [{ x: 1, y: 2 }];

            component.leaveGrid();

            expect(component['showDescriptionFor']).toBeNull();
            expect(component['shortestPath']).toEqual([]);
        });
    });

    describe('isCurrentPlayerTurn', () => {
        it('should return playerService.isCurrentPlayerTurn value', () => {
            playerServiceMock.isCurrentPlayerTurn = true;
            expect(component.isCurrentPlayerTurn()).toBeTrue();

            playerServiceMock.isCurrentPlayerTurn = false;
            expect(component.isCurrentPlayerTurn()).toBeFalse();
        });
    });

    describe('displayPath', () => {
        it('should return empty string when in attack mode', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(true);
            (component as any).shortestPath = [
                { x: 0, y: 0 },
                { x: 1, y: 1 },
            ];

            const result = component.displayPath();

            expect(result).toBe('');
        });

        it('should return empty string when shortestPath is empty', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(false);
            (component as any).shortestPath = [];

            const result = component.displayPath();

            expect(result).toBe('');
        });

        it('should return empty string when shortestPath has only one point', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(false);
            (component as any).shortestPath = [{ x: 0, y: 0 }];

            const result = component.displayPath();

            expect(result).toBe('');
        });

        it('should generate SVG path data for valid shortestPath', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(false);
            (component as any).shortestPath = [
                { x: 1, y: 2 },
                { x: 2, y: 2 },
                { x: 3, y: 3 },
            ];
            const tileCenter = TILE_CENTER_OFFSET;
            const expected = ` M ${1 + tileCenter} ${2 + tileCenter} L ${2 + tileCenter} ${2 + tileCenter} L ${3 + tileCenter} ${3 + tileCenter}`;

            const result = component.displayPath();

            expect(result).toBe(expected);
        });
    });

    describe('getReachableAreaPath', () => {
        it('should return empty string when not current player turn', () => {
            playerServiceMock.isCurrentPlayerTurn = false;

            const result = component.getReachableAreaPath();

            expect(result).toBe('');
        });

        it('should return contour path when it is current player turn', () => {
            playerServiceMock.isCurrentPlayerTurn = true;
            gameGridServiceMock.getReachableAreaPath.and.returnValue([{ x: 1, y: 1 }]);
            gridContourMock.getContourPath.and.returnValue('M1,1 L2,1 Z');
            (component as any).size = 10;

            const result = component.getReachableAreaPath();

            expect(gameGridServiceMock.getReachableAreaPath).toHaveBeenCalled();
            expect(gridContourMock.getContourPath).toHaveBeenCalledWith([{ x: 1, y: 1 }], 10);
            expect(result).toBe('M1,1 L2,1 Z');
        });
    });

    describe('handleTileClick', () => {
        let mockEvent: MouseEvent;

        beforeEach(() => {
            mockEvent = new MouseEvent('click', { button: 0 });
            (component as any).tiles = mockGridTiles;
        });

        it('should do nothing when not left click', () => {
            const rightClickEvent = new MouseEvent('click', { button: 2 });

            component.handleTileClick(rightClickEvent, 1, 1);

            expect(component['moveToTile']).not.toHaveBeenCalled();
            expect(combatServiceMock.startCombat).not.toHaveBeenCalled();
        });

        describe('when in attack mode', () => {
            beforeEach(() => {
                combatServiceMock.getAttackModeValue.and.returnValue(true);
            });

            it('should do nothing when target is not adjacent', () => {
                playerServiceMock.isMainPlayerAdjacent.and.returnValue(false);

                component.handleTileClick(mockEvent, 1, 1);

                expect(combatServiceMock.startCombat).not.toHaveBeenCalled();
                expect(gameGridServiceMock.breakWall).not.toHaveBeenCalled();
                expect(gameGridServiceMock.openDoor).not.toHaveBeenCalled();
            });

            it('should start combat when clicking on player', () => {
                const mockTarget = { _id: 'target-id', name: 'Target' };
                playerServiceMock.getPlayerAtPosition.and.returnValue(mockTarget as any);

                component.handleTileClick(mockEvent, 1, 1);

                expect(combatServiceMock.startCombat).toHaveBeenCalledWith('target-id');
                expect(combatServiceMock.setAttackMode).toHaveBeenCalledWith(false);
            });

            it('should break wall when player has pickaxe', () => {
                playerServiceMock.getPlayerAtPosition.and.returnValue(undefined);
                const mockTile = { material: [TileMaterial.Wall] };
                (component as any).tiles[1][1] = mockTile;

                const playerWithPickaxe = {
                    ...mockFixedPlayer,
                    items: [{ item: GameObjects.Pickaxe, position: { x: -1, y: -1 } }],
                };
                playerServiceMock.getMainPlayer.and.returnValue(playerWithPickaxe);

                component.handleTileClick(mockEvent, 1, 1);

                expect(gameGridServiceMock.breakWall).toHaveBeenCalledWith({ x: 1, y: 1 });
            });

            it('should open door when clicking on door without item', () => {
                playerServiceMock.getPlayerAtPosition.and.returnValue(undefined);
                const mockTile = { material: [TileMaterial.Door] };
                (component as any).tiles[1][1] = mockTile;
                gameGridServiceMock.itemToShowAtPosition.and.returnValue(undefined);

                component.handleTileClick(mockEvent, 1, 1);

                expect(gameGridServiceMock.openDoor).toHaveBeenCalledWith({ x: 1, y: 1 });
            });

            it('should not open door when item is present', () => {
                playerServiceMock.getPlayerAtPosition.and.returnValue(undefined);
                const mockTile = { material: [TileMaterial.Door] };
                (component as any).tiles[1][1] = mockTile;
                gameGridServiceMock.itemToShowAtPosition.and.returnValue({ item: GameObjects.Bomb } as any);

                component.handleTileClick(mockEvent, 1, 1);

                expect(gameGridServiceMock.openDoor).not.toHaveBeenCalled();
            });
        });

        it('should move to tile when not in attack mode', () => {
            combatServiceMock.getAttackModeValue.and.returnValue(false);

            component.handleTileClick(mockEvent, 1, 1);

            expect(component['moveToTile']).toHaveBeenCalledWith({ x: 1, y: 1 });
        });
    });

    describe('hideCombatVictoryMessage', () => {
        it('should call combat.hideCombatVictoryMessage', () => {
            component.hideCombatVictoryMessage();

            expect(combatServiceMock.hideCombatVictoryMessage).toHaveBeenCalled();
        });
    });

    describe('isPlayerFlagCarrier', () => {
        it('should return false when no player has matching spawn position', () => {
            playerServiceMock.getPlayers.and.returnValue([
                {
                    ...mockFixedPlayer,
                    spawnPointPosition: { x: 5, y: 5 },
                },
            ]);

            const result = component.isPlayerFlagCarrier(1, 2);

            expect(result).toBeFalse();
        });

        it('should return false when player with matching spawn does not have flag', () => {
            playerServiceMock.getPlayers.and.returnValue([
                {
                    ...mockFixedPlayer,
                    spawnPointPosition: { x: 1, y: 2 },
                    hasFlag: false,
                },
            ]);

            const result = component.isPlayerFlagCarrier(1, 2);

            expect(result).toBeFalse();
        });

        it('should return true when player with matching spawn has flag', () => {
            playerServiceMock.getPlayers.and.returnValue([
                {
                    ...mockFixedPlayer,
                    spawnPointPosition: { x: 1, y: 2 },
                    hasFlag: true,
                },
            ]);

            const result = component.isPlayerFlagCarrier(1, 2);

            expect(result).toBeTrue();
        });
    });

    describe('createGrid', () => {
        it('should set tiles and size', () => {
            gameGridServiceMock.getTiles.and.returnValue([
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                ],
                [
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                ],
            ] as any);

            component['createGrid']();

            expect(component['tiles']).toEqual([
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                ],
                [
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                ],
            ] as any);
            expect(component['size']).toBe(2);
        });
    });

    describe('moveToTile', () => {
        beforeEach(() => {
            (component as any).moveToTile = (component as any).constructor.prototype.moveToTile;
        });

        it('should do nothing when no main player', () => {
            playerServiceMock.getMainPlayer.and.returnValue(undefined);

            component['moveToTile']({ x: 1, y: 2 });

            expect(gameStateServiceMock.movePlayer).not.toHaveBeenCalled();
        });

        it('should call gameStateService.movePlayer with correct info', () => {
            const mockPlayer = {
                ...mockFixedPlayer,
                _id: 'player-id',
                position: { x: 0, y: 0 },
            };
            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer);
            gameGridServiceMock.getGameId.and.returnValue('game-id');

            component['moveToTile']({ x: 1, y: 2 }, true);

            expect(gameStateServiceMock.movePlayer).toHaveBeenCalledWith({
                gameId: 'game-id',
                movingPlayerId: 'player-id',
                sourcePosition: { x: 0, y: 0 },
                targetPosition: { x: 1, y: 2 },
                isTeleporting: true,
            });
        });
    });

    describe('setupSubscriberListeners', () => {
        it('should update winner info when combat victory message arrives', () => {
            const mockWinner = {
                ...mockFixedPlayer,
                name: 'WinnerName',
                championName: 'WinnerChampion',
            };
            playerServiceMock.getPlayers.and.returnValue([mockWinner]);

            component['setupSubscriberListeners']();
            victoryMessageSubject.next({ winnerName: 'WinnerName', show: true });

            expect(component['winnerUsername']).toBe('WinnerName');
            expect(component['winnerChampion']).toBe('WinnerChampion');
        });

        it('should update isDebugActive when debug status changes', () => {
            component['setupSubscriberListeners']();

            isDebugActiveSubject.next(true);
            expect(component['isDebugActive']).toBeTrue();

            isDebugActiveSubject.next(false);
            expect(component['isDebugActive']).toBeFalse();
        });
    });

    describe('getShortestPathLine', () => {
        beforeEach(() => {
            (component as any).getShortestPathLine = (component as any).constructor.prototype.getShortestPathLine;
        });

        it('should update shortestPath on successful path retrieval', async () => {
            const mockPath = {
                path: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                firstItemOnPath: undefined,
            };
            gameGridServiceMock.getShortestPathToTile.and.resolveTo(mockPath);

            await component['getShortestPathLine']({ x: 1, y: 1 });

            expect(gameGridServiceMock.getShortestPathToTile).toHaveBeenCalledWith({ x: 1, y: 1 });
            expect(component['shortestPath']).toEqual(mockPath.path);
        });
    });

    describe('showDescription', () => {
        beforeEach(() => {
            (component as any).showDescription = (component as any).constructor.prototype.showDescription;
        });

        it('should set showDescriptionFor to the given tile and set position to bottom when near top of screen', () => {
            const mockTile = mockGridTiles[0][0];
            const mockEvent = {
                currentTarget: {
                    getBoundingClientRect: () => ({
                        top: 10,
                        height: 50,
                    }),
                },
            } as unknown as MouseEvent;

            component['showDescription'](mockEvent, mockTile);

            expect(component['showDescriptionFor']).toBe(mockTile);
            expect(component['descriptionPosition']).toBe('bottom');
        });

        it('should set showDescriptionFor to the given tile and set position to top when not near top of screen', () => {
            const mockTile = mockGridTiles[0][0];
            const mockEvent = {
                currentTarget: {
                    getBoundingClientRect: () => ({
                        top: 100,
                        height: 50,
                    }),
                },
            } as unknown as MouseEvent;

            component['showDescription'](mockEvent, mockTile);

            expect(component['showDescriptionFor']).toBe(mockTile);
            expect(component['descriptionPosition']).toBe('top');
        });
    });

    describe('setupSocketListeners', () => {
        beforeEach(() => {
            (component as any).setupSocketListeners = (component as any).constructor.prototype.setupSocketListeners;
        });

        it('should call gameGridEventsService.setupSocketListeners with tiles and size', () => {
            const mockTiles = [
                [
                    { x: 0, y: 0 },
                    { x: 0, y: 1 },
                ],
                [
                    { x: 1, y: 0 },
                    { x: 1, y: 1 },
                ],
            ] as any;

            (component as any).tiles = mockTiles;
            (component as any).size = 2;

            component['setupSocketListeners']();

            expect(gameGridEventsServiceMock.setupSocketListeners).toHaveBeenCalledWith(mockTiles, 2);
        });
    });
});
