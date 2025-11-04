import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class TurnGatewayService {
    private server: Server;

    constructor(
        private readonly gameManagerService: GameManagerService,
        private readonly turnLogicService: TurnLogicService,
        private readonly botManagerService: BotManagerService,
    ) {}

    setServer(server: Server) {
        this.server = server;
    }

    turnStart(data: { gameId: string; playerId: string }) {
        this.turnLogicService.startTurn(data.gameId, data.playerId);
        this.server.to(data.gameId).emit(GameGatewayEvents.TurnChanged, data.playerId);
    }

    nextTurn(gameId: string) {
        const nextPlayerId = this.turnLogicService.nextTurn(gameId);
        this.server.to(gameId).emit(GameGatewayEvents.TurnChanged, nextPlayerId);

        const game = this.gameManagerService.getGame(gameId);
        if (!game) return;
    }

    endTurn(data: { gameId: string; playerId: string }) {
        this.turnLogicService.endTurn(data.gameId, data.playerId);
    }

    botTurn(data: { gameId: string; playerId: string }) {
        const game = this.gameManagerService.getGame(data.gameId);
        if (!game) return;

        const currentPlayer = game.players.find((player) => player._id === data.playerId);

        if (currentPlayer.isBot) {
            this.botManagerService.botTurn(data.gameId, currentPlayer);
        }
    }
}
