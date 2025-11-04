import { FAKE_HUMAN_DELAY } from '@app/constants/server-constants';
import { Lobby } from '@app/model/class/lobby/lobby';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { BotBehaviorService } from '@app/services/bot-logic/bot-behavior/bot-behavior.service';
import { BotCreationService } from '@app/services/bot-logic/bot-creation/bot-creation.service';

@Injectable()
export class BotManagerService {
    private server: Server;

    constructor(
        private gameManagerService: GameManagerService,
        private botCreationService: BotCreationService,
        private botBehaviorService: BotBehaviorService,
    ) {}

    setServer(server: Server): void {
        this.server = server;
        this.botBehaviorService.setServer(server);
    }

    createBot(lobby: Lobby, isAggressive: boolean): PlayerInfo {
        return this.botCreationService.createBot(lobby, isAggressive);
    }

    botTurn(gameId: string, botInfos: Player): void {
        const game = this.gameManagerService.getGame(gameId);
        if (!game) return;

        setTimeout(() => {
            this.botBehaviorService.botBehavior(game, botInfos);
        }, FAKE_HUMAN_DELAY * Math.random());
    }
}
