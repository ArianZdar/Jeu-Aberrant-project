import { MS_OF_ONE_SECOND, MS_OF_THIRTY_SECOND, TRANSITION_DELAY, TURN_TIMER } from '@app/constants/server-constants';
import { DELAY_BEFORE_EMITTING_TIME } from '@app/gateways/common/gateway.constants';
import { Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { ChatService } from '@app/services/chat/chat.service';
@Injectable()
export class TurnLogicService {
    private gamePlayersMap: Map<string, Player[]> = new Map();
    private gameCurrentPlayerIndexMap: Map<string, number> = new Map();
    private gameTurnTimerValueMap: Map<string, number> = new Map();
    private gameTurnTimerIntervalMap: Map<string, NodeJS.Timeout> = new Map();
    private gameTurnTimeoutTimerMap: Map<string, NodeJS.Timeout> = new Map();
    private gameTurnTimerPausedMap: Map<string, boolean> = new Map();

    private server: Server;

    constructor(private chatService: ChatService) {}

    setServer(server: Server) {
        this.server = server;
    }

    startGame(gameId: string, players: Player[]): Player[] {
        this.gamePlayersMap.set(gameId, [...players]);
        this.gameCurrentPlayerIndexMap.set(gameId, 0);
        this.gameTurnTimerPausedMap.set(gameId, false);

        players.forEach((player) => (player.isTurn = false));

        const firstPlayerId = players[0]._id;

        this.startTurn(gameId, firstPlayerId, true);
        this.pauseTurnTimer(gameId);

        if (this.server) {
            this.chatService.setServer(this.server);
            this.transitionToNextPlayer(gameId, firstPlayerId);
        }

        return players;
    }

    startTurn(gameId: string, playerId: string, isFirstTurn: boolean = false): void {
        const players = this.gamePlayersMap.get(gameId);
        if (!players) {
            return;
        }

        const currentPlayer = players.find((player) => player._id === playerId);
        if (currentPlayer) {
            currentPlayer.isTurn = true;
        }

        this.startTimer(gameId);

        if (isFirstTurn) {
            setTimeout(() => {
                this.server.to(gameId).emit(GameGatewayEvents.TurnStart, playerId);
            }, DELAY_BEFORE_EMITTING_TIME);
        } else {
            this.server.to(gameId).emit(GameGatewayEvents.TurnStart, playerId);
        }
    }

    endTurn(gameId: string, playerId: string): void {
        const players = this.gamePlayersMap.get(gameId);
        if (!players) return;
        const currentPlayer = players.find((player) => player._id === playerId);
        let winningTeam: Teams | undefined;
        const isOnSpawnPoint =
            currentPlayer.position.x === currentPlayer.spawnPointPosition.x && currentPlayer.position.y === currentPlayer.spawnPointPosition.y;
        if (currentPlayer.hasFlag && isOnSpawnPoint) {
            this.server.to(gameId).emit(GameGatewayEvents.TeamWon, currentPlayer.team);
            winningTeam = currentPlayer.team;
        }

        if (winningTeam) {
            for (const player of players) {
                if (player.team === winningTeam) {
                    player.isWinner = true;
                }
            }
        }

        if (currentPlayer) {
            currentPlayer.isTurn = false;
            currentPlayer.speed = currentPlayer.maxSpeed;
            currentPlayer.actionPoints = currentPlayer.maxActionPoints;
        }
    }

    nextTurn(gameId: string): string {
        const players = this.gamePlayersMap.get(gameId);
        if (!players || players.length === 0) {
            return '';
        }

        const currentPlayerIndex = this.gameCurrentPlayerIndexMap.get(gameId);
        if (currentPlayerIndex === undefined) {
            let firstConnectedIdx = 0;
            while (firstConnectedIdx < players.length && !players[firstConnectedIdx].isConnected) {
                firstConnectedIdx++;
            }

            if (firstConnectedIdx >= players.length) {
                return '';
            }

            this.gameCurrentPlayerIndexMap.set(gameId, firstConnectedIdx);
            const firstPlayerId = players[firstConnectedIdx]._id;
            this.transitionToNextPlayer(gameId, firstPlayerId);
            return firstPlayerId;
        }

        if (currentPlayerIndex >= 0 && currentPlayerIndex < players.length) {
            this.endTurn(gameId, players[currentPlayerIndex]._id);
        }

        let nextIndex = (currentPlayerIndex + 1) % players.length;
        let attempts = 0;

        while (attempts < players.length) {
            if (players[nextIndex].isConnected) {
                break;
            }
            nextIndex = (nextIndex + 1) % players.length;
            attempts++;
        }

        if (attempts >= players.length) {
            return '';
        }

        this.gameCurrentPlayerIndexMap.set(gameId, nextIndex);
        const nextPlayerId = players[nextIndex]._id;
        this.transitionToNextPlayer(gameId, nextPlayerId);

        return nextPlayerId;
    }

    startTimer(gameId: string): void {
        this.clearTimer(gameId);
        this.gameTurnTimerValueMap.set(gameId, TURN_TIMER);
        this.gameTurnTimerPausedMap.set(gameId, false);

        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.TimerTick, TURN_TIMER);
        }

        const interval = setInterval(() => {
            if (this.gameTurnTimerPausedMap.get(gameId)) {
                return;
            }

            let timerValue = this.gameTurnTimerValueMap.get(gameId) || TURN_TIMER;
            timerValue--;
            this.gameTurnTimerValueMap.set(gameId, timerValue);

            if (this.server) {
                this.server.to(gameId).emit(GameGatewayEvents.TimerTick, timerValue);
            }

            if (timerValue <= 0) {
                this.clearTimer(gameId);

                const nextPlayerId = this.nextTurn(gameId);
                if (this.server && nextPlayerId) {
                    this.server.to(gameId).emit(GameGatewayEvents.TurnChanged, nextPlayerId);
                }
            }
        }, MS_OF_ONE_SECOND);
        this.gameTurnTimerIntervalMap.set(gameId, interval);

        const timeout = setTimeout(() => {
            if (!this.gameTurnTimerPausedMap.get(gameId)) {
                this.clearTimer(gameId);

                const nextPlayerId = this.nextTurn(gameId);
                if (this.server && nextPlayerId) {
                    this.server.to(gameId).emit(GameGatewayEvents.TurnChanged, nextPlayerId);
                }
            }
        }, MS_OF_THIRTY_SECOND);
        this.gameTurnTimeoutTimerMap.set(gameId, timeout);
    }

    updatePlayers(gameId: string, players: Player[]): void {
        this.gamePlayersMap.set(gameId, [...players]);
    }

    getPlayers(gameId: string): Player[] | undefined {
        return this.gamePlayersMap.get(gameId);
    }

    pauseTurnTimer(gameId: string): void {
        this.gameTurnTimerPausedMap.set(gameId, true);
        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.TurnTimerPaused, true);
        }
    }

    resumeTurnTimer(gameId: string): void {
        this.gameTurnTimerPausedMap.set(gameId, false);
        if (this.server) {
            this.server.to(gameId).emit(GameGatewayEvents.TurnTimerPaused, false);
        }
    }

    cleanupGame(gameId: string): void {
        this.clearTimer(gameId);
        this.gamePlayersMap.delete(gameId);
        this.gameCurrentPlayerIndexMap.delete(gameId);
        this.gameTurnTimerValueMap.delete(gameId);
        this.gameTurnTimerPausedMap.delete(gameId);
    }

    endBotTurn(gameId: string): void {
        const nextPlayerId = this.nextTurn(gameId);
        this.server.to(gameId).emit(GameGatewayEvents.TurnChanged, nextPlayerId);
    }

    private clearTimer(gameId: string): void {
        const timeout = this.gameTurnTimeoutTimerMap.get(gameId);
        if (timeout) {
            clearTimeout(timeout);
            this.gameTurnTimeoutTimerMap.delete(gameId);
        }

        const interval = this.gameTurnTimerIntervalMap.get(gameId);
        if (interval) {
            clearInterval(interval);
            this.gameTurnTimerIntervalMap.delete(gameId);
        }
    }

    private transitionToNextPlayer(gameId: string, nextPlayerId: string): void {
        const players = this.gamePlayersMap.get(gameId);
        if (players) {
            const nextPlayer = players.find((player) => player._id === nextPlayerId);
            if (nextPlayer) {
                const playerName = nextPlayer.name;
                this.chatService.nextTurnEvent(gameId, playerName, nextPlayerId);
            }
        }
        this.server.to(gameId).emit(GameGatewayEvents.TurnTransition, nextPlayerId);

        this.startTurn(gameId, nextPlayerId);
        this.pauseTurnTimer(gameId);
        setTimeout(() => {
            this.resumeTurnTimer(gameId);
        }, TRANSITION_DELAY);
    }
}
