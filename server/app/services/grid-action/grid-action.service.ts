import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Coordinate } from '@common/game/game-info';
import { ShortestPath } from '@common/grid/shortest-path';
import { PlayerMovementInfo } from '@common/player/player-movement-info';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class GridActionService {
    private server: Server;

    constructor(private readonly gameManagerService: GameManagerService) {}

    setServer(server: Server) {
        this.server = server;
    }

    async useDoor(playerId: string, targetDoor: Coordinate) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        if (!game || !targetDoor) {
            return;
        }

        const success = this.gameManagerService.toggleDoorState(game.id, playerId, targetDoor);

        if (!success) {
            return;
        }

        this.server.to(game.id).emit(GameGatewayEvents.GridUpdated, {
            updatedTile: targetDoor,
            breakWall: false,
        });

        this.server.to(game.id).emit(GameGatewayEvents.PlayersUpdated);
    }

    async breakWall(playerId: string, targetTile: Coordinate) {
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        if (!game || !targetTile) {
            return;
        }

        const success = this.gameManagerService.breakWall(game.id, playerId, targetTile);

        if (!success) {
            return;
        }

        this.server.to(game.id).emit(GameGatewayEvents.GridUpdated, {
            updatedTile: targetTile,
            breakWall: true,
        });
        this.server.to(game.id).emit(GameGatewayEvents.PlayersUpdated);
    }

    getAccessibleTiles(playerId: string): Coordinate[] {
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        return !game ? [] : this.gameManagerService.getAccessibleTileForPlayer(game.id, playerId) || [];
    }

    movePlayer(data: PlayerMovementInfo) {
        const movementResult = this.gameManagerService.movePlayer(data);

        if (movementResult?.players) this.server.to(data.gameId).emit(GameGatewayEvents.MovePlayer, movementResult);
    }

    getShortestPathToTile(data: { gameId: string; playerId: string; destination: Coordinate }): ShortestPath {
        const { gameId, playerId, destination } = data;

        if (!playerId || !gameId || !destination) {
            return { path: [], firstItemOnPath: undefined };
        }

        return this.gameManagerService.getShortestPathToTile(gameId, playerId, destination);
    }
}
