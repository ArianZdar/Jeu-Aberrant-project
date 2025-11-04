import { Injectable } from '@nestjs/common';
import { Lobby } from '@app/model/class/lobby/lobby';
import { PlayerInfo } from '@common/player/player-info';
import { BOT_NAME, CHAMPIONS, COIN_FLIP_PROBABILITY, ID_LENGTH, MAX_POWER, MIN_POWER } from '@app/constants/server-constants';

@Injectable()
export class BotCreationService {
    createBot(lobby: Lobby, isAggressive: boolean): PlayerInfo {
        let stringBotName = BOT_NAME[Math.floor(Math.random() * BOT_NAME.length)];
        while (lobby.getPlayers().find((player) => player.name === stringBotName)) {
            stringBotName = BOT_NAME[Math.floor(Math.random() * BOT_NAME.length)];
        }

        let idBot = 'bot-' + Math.random().toString(ID_LENGTH);
        while (lobby.getPlayers().find((player) => player._id === idBot)) {
            idBot = 'bot-' + Math.random().toString(ID_LENGTH);
        }

        let championIndex = Math.floor(Math.random() * CHAMPIONS.length);
        while (lobby.getPlayers().find((player) => player.championIndex === championIndex)) {
            championIndex = Math.floor(Math.random() * CHAMPIONS.length);
        }

        const isHighHealth = Math.random() > COIN_FLIP_PROBABILITY;
        const healthPower = isHighHealth ? MAX_POWER : MIN_POWER;
        const speed = isHighHealth ? MIN_POWER : MAX_POWER;

        const isHighAttack = Math.random() > COIN_FLIP_PROBABILITY;
        const attackPower = isHighAttack ? MAX_POWER : MIN_POWER;
        const defensePower = isHighAttack ? MIN_POWER : MAX_POWER;

        const bot: PlayerInfo = {
            _id: idBot,
            name: stringBotName,
            championIndex,
            healthPower,
            attackPower,
            defensePower,
            speed,
            isReady: true,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: true,
            isAggressive,
            isLeader: false,
        };

        return bot;
    }
}
