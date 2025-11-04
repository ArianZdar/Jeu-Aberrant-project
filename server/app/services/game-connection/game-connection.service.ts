import { ChatService } from '@app/services/chat/chat.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameConfig } from '@common/game/game-config';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';

@Injectable()
export class GameConnectionService {
    private server: Server;
    private readonly lobbySocketIdToGameSocketId: Map<string, string> = new Map<string, string>();

    constructor(
        private readonly gameManagerService: GameManagerService,
        private readonly turnLogicService: TurnLogicService,
        private readonly chatService: ChatService,
        private readonly itemBehaviorService: ItemBehaviorService,
        private readonly baseGatewayService: BaseGatewayService,
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    async createGame(data: GameConfig) {
        const createdGame = await this.gameManagerService.createGame(data);
        if (!createdGame) return { success: false };

        this.turnLogicService.startGame(data.id, createdGame.players);
        if (createdGame) {
            for (const player of createdGame.players) {
                const lobbySocketId = player._id;
                const gameSocketId = this.lobbySocketIdToGameSocketId.get(lobbySocketId);
                if (gameSocketId) {
                    player._id = gameSocketId;
                }
            }
            return { success: true, gameId: createdGame.id };
        }
    }

    joinGame(socket: Socket, gameId: string) {
        const game = this.gameManagerService.getGame(gameId);
        if (game) {
            socket.join(gameId);
        }

        const players = this.gameManagerService.getPlayers(gameId);
        const currentTurnPlayer = players.find((p) => p.isTurn);

        if (currentTurnPlayer) {
            this.server.to(socket.id).emit(GameGatewayEvents.TurnChanged, currentTurnPlayer._id);
        }
    }

    getPlayers(socket: Socket) {
        const playerId = socket.id;
        const game = this.gameManagerService.findGameByPlayerId(playerId);
        if (!game) {
            return [];
        }
        return this.gameManagerService.getPlayers(game.id);
    }

    getMapId(socket: Socket) {
        const playerId = socket.id;
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        return !game ? null : game.mapId;
    }

    rebindSocketId(data: { lobbySocketId: string; gameSocketId: string }) {
        if (!data.lobbySocketId || !data.gameSocketId) {
            return;
        }
        this.lobbySocketIdToGameSocketId.set(data.lobbySocketId, data.gameSocketId);
    }

    leaveGame(socket: Socket) {
        const playerId = socket.id;
        const game = this.gameManagerService.findGameByPlayerId(playerId);

        if (!game) return;

        const players = game.players;
        const leavingPlayer = players.find((player) => player._id === playerId);
        const gameId = game.id;

        this.itemBehaviorService.dropAllItems(game, leavingPlayer);

        if (leavingPlayer) {
            this.chatService.playerLeftEvent(gameId, leavingPlayer);
        }

        if (leavingPlayer.isLeader) {
            game.deactivateDebug();
            socket.to(gameId).emit(GameGatewayEvents.DeactivateDebug);
        }

        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
            if (room !== socket.id) socket.leave(room);
        });

        this.gameManagerService.updatePlayerConnectionStatus(playerId, false);
        this.gameManagerService.removePlayer(playerId);

        this.server.to(gameId).emit(GameGatewayEvents.PlayersUpdated);
        this.server.to(game.id).emit(GameGatewayEvents.UpdateItems, game.players);

        const remainingPlayers = this.gameManagerService.getPlayers(gameId);
        const connectedPlayers = remainingPlayers.filter((player) => player.isConnected);

        if (connectedPlayers.length === 1) {
            this.server.to(gameId).emit(GameGatewayEvents.LastPlayerConnected, connectedPlayers[0]._id);
        } else if (connectedPlayers.length > 0 && leavingPlayer.isTurn) {
            const nextPlayerId = this.turnLogicService.nextTurn(gameId);
            if (nextPlayerId) {
                this.server.to(gameId).emit(GameGatewayEvents.TurnChanged, nextPlayerId);
            }
        }
    }

    handleConnection(socket: Socket) {
        const lobbySocketId = socket.handshake.auth.lobbySocketId;
        if (lobbySocketId) {
            this.lobbySocketIdToGameSocketId.set(lobbySocketId, socket.id);
        }
    }

    handleDisconnect(socket: Socket) {
        this.leaveGame(socket);
        for (const [lobbyId, playerId] of this.lobbySocketIdToGameSocketId.entries()) {
            if (playerId === socket.id) {
                this.lobbySocketIdToGameSocketId.delete(lobbyId);
                break;
            }
        }
        this.baseGatewayService.handleDisconnect(socket);
    }
}
