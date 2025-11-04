import { Injectable, inject } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Coordinate, Tile } from '@common/game/game-info';
import { MovementData } from '@common/player/player-movement-info';
import { GameItem } from '@common/grid/grid-state';
import { InventoryFullDialogComponent } from '@app/components/game-page-components/inventory-full-dialog/inventory-full-dialog.component';

@Injectable({
    providedIn: 'root',
})
export class GameGridEventsService {
    private readonly gameStateService = inject(GameStateService);
    private readonly gameGridService = inject(GameGridService);
    private readonly playerService = inject(PlayerService);
    private readonly combat = inject(CombatService);
    private readonly dialog = inject(MatDialog);
    private inventoryDialogOpen = false;

    setupSocketListeners(tiles: Tile[][], size: number): void {
        this.setupMovePlayerListener(tiles, size);
        this.setupGridUpdatedListener(tiles, size);
        this.setupUpdateItemsListener();
        this.setupInventoryFullListener();
    }

    removeSocketListeners(): void {
        this.inventoryDialogOpen = false;
        this.gameStateService.off(GameGatewayEvents.MovePlayer);
        this.gameStateService.off(GameGatewayEvents.GridUpdated);
        this.gameStateService.off(GameGatewayEvents.UpdateItems);
        this.gameStateService.off(GameGatewayEvents.InventoryFull);
    }

    private setupMovePlayerListener(tiles: Tile[][], size: number): void {
        this.gameStateService.on(GameGatewayEvents.MovePlayer, async (movementData: MovementData) => {
            await this.playerService.animatePlayerMovement(movementData.playerId, movementData.path, movementData.players);
            this.gameGridService.updateReachableTiles();
            const continueTurn = this.playerService.continueTurn(tiles, size);

            if (movementData.isEndingOnItem && movementData.playerId === this.playerService.getMainPlayer()?._id) {
                this.gameStateService.pickupItem(movementData.path[movementData.path.length - 1]);
            }

            if (!continueTurn) {
                this.gameStateService.nextTurn(this.gameGridService.getGameId());
            }
        });
    }

    private setupGridUpdatedListener(tiles: Tile[][], size: number): void {
        this.gameStateService.on(GameGatewayEvents.GridUpdated, (data: { updatedTile: Coordinate; breakWall: boolean }) => {
            if (data?.updatedTile) {
                if (data.breakWall) {
                    this.gameGridService.updateWall(data.updatedTile);
                } else {
                    this.gameGridService.updateDoor(data.updatedTile);
                }
                this.combat.setAttackMode(false);
            }
            const player = this.playerService.getMainPlayer();
            if (player && this.playerService.isCurrentPlayerTurn) {
                player.actionPoints--;
            }
            const continueTurn = this.playerService.continueTurn(tiles, size);

            if (!continueTurn) {
                this.gameStateService.nextTurn(this.gameGridService.getGameId());
            }
        });
    }

    private setupUpdateItemsListener(): void {
        this.gameStateService.on(GameGatewayEvents.UpdateItems, () => {
            this.gameStateService.getPlayers().then((players) => {
                this.playerService.updatePlayer(players);
                this.gameGridService.updateReachableTiles();
            });

            this.gameStateService.getItems().then((items) => {
                this.gameGridService.setItems(items);
            });
        });
    }

    private setupInventoryFullListener(): void {
        this.gameStateService.on(GameGatewayEvents.InventoryFull, () => {
            this.gameStateService.getPlayers().then((players) => {
                this.playerService.updatePlayer(players);

                if (this.inventoryDialogOpen) {
                    return;
                }

                this.inventoryDialogOpen = true;
                const player = this.playerService.getMainPlayer();

                if (player?.position) {
                    const dialogRef = this.dialog.open(InventoryFullDialogComponent, {
                        width: '40vw',
                        disableClose: true,
                        data: {
                            items: player.items,
                        },
                    });

                    dialogRef.afterClosed().subscribe((selectedItem) => {
                        this.gameStateService.resumeTurnTimer(this.gameGridService.getGameId());

                        if (selectedItem && player.position) {
                            const itemToDrop: GameItem = {
                                item: selectedItem.item,
                                position: { ...player.position },
                            };

                            this.gameStateService.dropItem(itemToDrop);
                        }

                        this.inventoryDialogOpen = false;
                    });
                }
            });

            this.gameStateService.getItems().then((items) => {
                this.gameGridService.setItems(items);
            });
        });
    }
}
