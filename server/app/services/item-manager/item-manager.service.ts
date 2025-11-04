import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { Coordinate } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { GameItem } from '@common/grid/grid-state';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class ItemManagerService {
    private server: Server;

    constructor(
        private readonly gameManagerService: GameManagerService,
        private readonly itemBehaviorService: ItemBehaviorService,
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    getItems(playerId: string) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        return game ? Array.from(game.items) : [];
    }

    pickupItem(playerId: string, itemPosition: Coordinate) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        const isItemPickedUp = this.gameManagerService.pickupItem(game, playerId, itemPosition);
        if (isItemPickedUp) {
            this.server.to(game.id).emit(GameGatewayEvents.UpdateItems, game.players);
        } else {
            this.server.to(playerId).emit(GameGatewayEvents.InventoryFull);
        }
    }

    dropItem(playerId: string, gameItem: GameItem) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        if (!game) return;

        const player = game.players.find((p) => p._id === playerId);
        if (!player) return;

        const itemIndex = player.items.findIndex((item) => item.item === gameItem.item);

        if (itemIndex !== -1) {
            const removedItem = player.items.splice(itemIndex, 1)[0];
            removedItem.position = { x: player.position.x, y: player.position.y };

            this.itemBehaviorService.removePassiveItemEffect({
                player,
                gameItem: removedItem,
            });

            this.server.to(game.id).emit(GameGatewayEvents.UpdateItems, Array.from(game.items));
        }
    }
}
