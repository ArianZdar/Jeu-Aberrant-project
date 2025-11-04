/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable @typescript-eslint/no-empty-function */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-magic-numbers */
import { TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { of } from 'rxjs';
import { GameGridEventsService } from './game-grid-events.service';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Tile } from '@common/game/game-info';
import { MovementData } from '@common/player/player-movement-info';
import { InventoryFullDialogComponent } from '@app/components/game-page-components/inventory-full-dialog/inventory-full-dialog.component';
import { Player } from '@common/player/player';
import { GameItem } from '@common/grid/grid-state';
import { GameObjects } from '@common/game/game-enums';
import { mockPlayers } from '@app/constants/mocks';

describe('GameGridEventsService', () => {
    let service: GameGridEventsService;
    let gameStateServiceMock: jasmine.SpyObj<GameStateService>;
    let gameGridServiceMock: jasmine.SpyObj<GameGridService>;
    let playerServiceMock: jasmine.SpyObj<PlayerService>;
    let combatServiceMock: jasmine.SpyObj<CombatService>;
    let dialogMock: jasmine.SpyObj<MatDialog>;
    let mockTiles: Tile[][];
    let mockSize: number;
    let mockDialogRef: jasmine.SpyObj<MatDialogRef<InventoryFullDialogComponent>>;

    beforeEach(() => {
        mockDialogRef = jasmine.createSpyObj('MatDialogRef', ['afterClosed']);
        mockDialogRef.afterClosed.and.returnValue(of(null));

        gameStateServiceMock = jasmine.createSpyObj('GameStateService', [
            'on',
            'off',
            'pickupItem',
            'nextTurn',
            'getPlayers',
            'getItems',
            'resumeTurnTimer',
            'dropItem',
        ]);
        gameGridServiceMock = jasmine.createSpyObj('GameGridService', ['updateReachableTiles', 'getGameId', 'updateWall', 'updateDoor', 'setItems']);
        playerServiceMock = jasmine.createSpyObj('PlayerService', ['animatePlayerMovement', 'continueTurn', 'getMainPlayer', 'updatePlayer']);
        combatServiceMock = jasmine.createSpyObj('CombatService', ['setAttackMode']);
        dialogMock = jasmine.createSpyObj('MatDialog', ['open']);
        dialogMock.open.and.returnValue(mockDialogRef);

        mockTiles = [[]];
        mockSize = 10;

        gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve([]));
        gameStateServiceMock.getItems.and.returnValue(Promise.resolve(new Set() as Set<GameItem>));
        gameGridServiceMock.getGameId.and.returnValue('game-123');

        TestBed.configureTestingModule({
            providers: [
                GameGridEventsService,
                { provide: GameStateService, useValue: gameStateServiceMock },
                { provide: GameGridService, useValue: gameGridServiceMock },
                { provide: PlayerService, useValue: playerServiceMock },
                { provide: CombatService, useValue: combatServiceMock },
                { provide: MatDialog, useValue: dialogMock },
            ],
        });

        service = TestBed.inject(GameGridEventsService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('setupSocketListeners', () => {
        it('should set up all socket listeners', () => {
            service.setupSocketListeners(mockTiles, mockSize);

            expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.MovePlayer, jasmine.any(Function));
            expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.GridUpdated, jasmine.any(Function));
            expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems, jasmine.any(Function));
            expect(gameStateServiceMock.on).toHaveBeenCalledWith(GameGatewayEvents.InventoryFull, jasmine.any(Function));
        });
    });

    describe('removeSocketListeners', () => {
        it('should remove all socket listeners', () => {
            service.removeSocketListeners();

            expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.MovePlayer);
            expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.GridUpdated);
            expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems);
            expect(gameStateServiceMock.off).toHaveBeenCalledWith(GameGatewayEvents.InventoryFull);
        });
    });

    describe('setupMovePlayerListener', () => {
        it('should handle player movement with continuing turn', async () => {
            const movePlayerCallback = setupMovePlayerListenerAndGetCallback();
            const mockMovementData: MovementData = {
                playerId: 'player1',
                path: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                players: [],
                isEndingOnItem: false,
            };

            playerServiceMock.continueTurn.and.returnValue(true);

            await movePlayerCallback(mockMovementData);

            expect(playerServiceMock.animatePlayerMovement).toHaveBeenCalledWith(
                'player1',
                [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                [],
            );
            expect(gameGridServiceMock.updateReachableTiles).toHaveBeenCalled();
            expect(gameStateServiceMock.nextTurn).not.toHaveBeenCalled();
        });

        it('should handle player movement with ending turn', async () => {
            const movePlayerCallback = setupMovePlayerListenerAndGetCallback();
            const mockMovementData: MovementData = {
                playerId: 'player1',
                path: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                players: [],
                isEndingOnItem: false,
            };

            playerServiceMock.continueTurn.and.returnValue(false);

            await movePlayerCallback(mockMovementData);

            expect(playerServiceMock.animatePlayerMovement).toHaveBeenCalled();
            expect(gameStateServiceMock.nextTurn).toHaveBeenCalledWith('game-123');
        });

        it('should pick up item if ending on item and is main player', async () => {
            const movePlayerCallback = setupMovePlayerListenerAndGetCallback();
            const mockMovementData: MovementData = {
                playerId: 'player1',
                path: [
                    { x: 0, y: 0 },
                    { x: 1, y: 1 },
                ],
                players: [],
                isEndingOnItem: true,
            };

            const mockPlayer = { _id: 'player1' };
            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer as Player);

            await movePlayerCallback(mockMovementData);

            expect(gameStateServiceMock.pickupItem).toHaveBeenCalledWith({ x: 1, y: 1 });
        });

        function setupMovePlayerListenerAndGetCallback(): Function {
            let callback: Function = () => {};
            gameStateServiceMock.on.and.callFake((event: string, cb: Function) => {
                if (event === GameGatewayEvents.MovePlayer) {
                    callback = cb;
                }
            });
            service.setupSocketListeners(mockTiles, mockSize);
            return callback;
        }
    });

    describe('setupGridUpdatedListener', () => {
        it('should update wall when breakWall is true', () => {
            const gridUpdatedCallback = setupGridUpdatedListenerAndGetCallback();
            const mockData = {
                updatedTile: { x: 3, y: 4 },
                breakWall: true,
            };

            gridUpdatedCallback(mockData);

            expect(gameGridServiceMock.updateWall).toHaveBeenCalledWith({ x: 3, y: 4 });
            expect(gameGridServiceMock.updateDoor).not.toHaveBeenCalled();
            expect(combatServiceMock.setAttackMode).toHaveBeenCalledWith(false);
        });

        it('should update door when breakWall is false', () => {
            const gridUpdatedCallback = setupGridUpdatedListenerAndGetCallback();
            const mockData = {
                updatedTile: { x: 3, y: 4 },
                breakWall: false,
            };

            gridUpdatedCallback(mockData);

            expect(gameGridServiceMock.updateDoor).toHaveBeenCalledWith({ x: 3, y: 4 });
            expect(gameGridServiceMock.updateWall).not.toHaveBeenCalled();
            expect(combatServiceMock.setAttackMode).toHaveBeenCalledWith(false);
        });

        it('should decrement action points for current player', () => {
            const gridUpdatedCallback = setupGridUpdatedListenerAndGetCallback();
            const mockData = {
                updatedTile: { x: 3, y: 4 },
                breakWall: false,
            };

            const mockPlayer = { actionPoints: 3 };
            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer as any);
            playerServiceMock.isCurrentPlayerTurn = true;

            gridUpdatedCallback(mockData);

            expect(mockPlayer.actionPoints).toBe(2);
        });

        function setupGridUpdatedListenerAndGetCallback(): Function {
            let callback: Function = () => {};
            gameStateServiceMock.on.and.callFake((event: string, cb: Function) => {
                if (event === GameGatewayEvents.GridUpdated) {
                    callback = cb;
                }
            });
            service.setupSocketListeners(mockTiles, mockSize);
            return callback;
        }
    });

    describe('setupUpdateItemsListener', () => {
        it('should update players and items when UpdateItems event is received', async () => {
            const updateItemsCallback = setupUpdateItemsListenerAndGetCallback();

            const mockItems = new Set([{ item: GameObjects.Armor, position: { x: 1, y: 1 } }]) as Set<GameItem>;

            gameStateServiceMock.getPlayers.and.returnValue(Promise.resolve(mockPlayers as any[]));
            gameStateServiceMock.getItems.and.returnValue(Promise.resolve(mockItems));

            await updateItemsCallback();

            expect(playerServiceMock.updatePlayer).toHaveBeenCalledWith(mockPlayers);
            expect(gameGridServiceMock.setItems).toHaveBeenCalledWith(mockItems);
            expect(gameGridServiceMock.updateReachableTiles).toHaveBeenCalled();
        });

        function setupUpdateItemsListenerAndGetCallback(): Function {
            let callback: Function = () => {};
            gameStateServiceMock.on.and.callFake((event: string, cb: Function) => {
                if (event === GameGatewayEvents.UpdateItems) {
                    callback = cb;
                }
            });
            service.setupSocketListeners(mockTiles, mockSize);
            return callback;
        }
    });

    describe('setupInventoryFullListener', () => {
        it('should open dialog when inventory is full and player exists', async () => {
            const inventoryFullCallback = setupInventoryFullListenerAndGetCallback();

            const mockPlayer = {
                _id: 'player1',
                position: { x: 2, y: 2 },
                items: [{ id: 'item1' }, { id: 'item2' }],
            };

            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer as any);

            await inventoryFullCallback();

            expect(dialogMock.open).toHaveBeenCalledWith(
                InventoryFullDialogComponent,
                jasmine.objectContaining({
                    width: '40vw',
                    disableClose: true,
                    data: { items: [{ id: 'item1' }, { id: 'item2' }] },
                }),
            );
        });

        it('should handle item drop when dialog is closed with selection', async () => {
            const inventoryFullCallback = setupInventoryFullListenerAndGetCallback();

            const mockPlayer = {
                _id: 'player1',
                position: { x: 2, y: 2 },
                items: [
                    {
                        item: GameObjects.Armor,
                        position: { x: -1, y: -1 },
                    },
                    {
                        item: GameObjects.Shield,
                        position: { x: -1, y: -1 },
                    },
                ],
            };

            const selectedItem = {
                item: GameObjects.Armor,
                position: { x: -1, y: -1 },
            };
            mockDialogRef.afterClosed.and.returnValue(of(selectedItem));
            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer as any);

            await inventoryFullCallback();

            expect(gameStateServiceMock.resumeTurnTimer).toHaveBeenCalledWith('game-123');
            expect(gameStateServiceMock.dropItem).toHaveBeenCalledWith({
                item: GameObjects.Armor,
                position: { x: 2, y: 2 },
            });
        });

        it('should not open dialog when inventory dialog is already open', async () => {
            const inventoryFullCallback = setupInventoryFullListenerAndGetCallback();

            const mockPlayer = {
                _id: 'player1',
                position: { x: 2, y: 2 },
                items: [{ id: 'item1' }, { id: 'item2' }],
            };
            playerServiceMock.getMainPlayer.and.returnValue(mockPlayer as any);

            Object.defineProperty(service, 'inventoryDialogOpen', {
                value: true,
                writable: true,
            });

            await inventoryFullCallback();

            expect(dialogMock.open).not.toHaveBeenCalled();
        });

        function setupInventoryFullListenerAndGetCallback(): Function {
            let callback: Function = () => {};
            gameStateServiceMock.on.and.callFake((event: string, cb: Function) => {
                if (event === GameGatewayEvents.InventoryFull) {
                    callback = cb;
                }
            });
            service.setupSocketListeners(mockTiles, mockSize);
            return callback;
        }
    });
});
