import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ActionJournalEvents, CommonGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Game } from '@app/model/class/game/game';
import { AttackResult } from '@common/player/attack-result';
import { MIN_POWER, WORD_MAX_LENGTH } from '@app/constants/server-constants';
import { ITEM_LABELS_FR } from '@common/game/game-enums';
import { ChatMessage } from '@common/game/message';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';

@Injectable()
export class ChatService {
    private server: Server;

    constructor(private readonly baseGatewayService: BaseGatewayService) {}

    setServer(server: Server): void {
        this.server = server;
    }

    handleRoomMessage(game: Game, message: ChatMessage): void {
        if (!game) {
            return;
        }
        const trimContent = message.content.length > WORD_MAX_LENGTH ? message.content.substring(0, WORD_MAX_LENGTH) : message.content;
        message.content = trimContent;

        this.baseGatewayService.addMessageToRoom(game.id, message);

        this.server.to(game.id).emit(CommonGatewayEvents.RoomMessage, message);
    }

    handleChatHistory(socket: Socket, lobbyId: string) {
        if (!lobbyId) return;
        const lobbyMessages = this.baseGatewayService.getMessagesFromRoom(lobbyId);
        if (lobbyMessages && lobbyMessages.messages.length > 0) {
            socket.emit(CommonGatewayEvents.ChatHistory, lobbyMessages.messages);
        } else {
            socket.emit(CommonGatewayEvents.ChatHistory, []);
        }
    }

    sendFirstTurnMessage(game: Game) {
        if (!game) return;
        const players = game.players;
        for (const player of players) {
            if (player.isTurn) {
                this.nextTurnEvent(game.id, player.name, player._id);
            }
        }
    }

    doorEvent(gameId: string, player: Player, isDoorOpen: boolean): void {
        const doorAction = isDoorOpen ? 'fermé' : 'ouvert';
        this.server.to(gameId).emit(ActionJournalEvents.DoorToggleJournal, {
            message: `${player.name} a ${doorAction} une porte.`,
            involvedPlayers: [player._id],
        });
    }

    playerLeftEvent(gameId: string, player: Player): void {
        this.server.to(gameId).emit(ActionJournalEvents.LeaveGameJournal, {
            message: `${player.name} a quitté la partie.`,
            involvedPlayers: [player._id],
        });
    }

    toggleDebugEvent(game: Game, player: Player): void {
        this.server.to(game.id).emit(ActionJournalEvents.ToggleDebugJournal, {
            message: `${player.name} a ${game.isDebugModeActive ? 'activé' : 'désactivé'} le mode debug.`,
            involvedPlayers: [player._id],
        });
    }

    startCombatEvent(gameId: string, attacker: Player, target: Player): void {
        this.server.to(gameId).emit(ActionJournalEvents.CombatJournal, {
            message: `Combat commencé entre ${attacker.name} et ${target.name}.`,
            involvedPlayers: [attacker._id, target._id],
        });
    }

    escapeAttemptEvent(gameId: string, player: Player, escapeSuccess: boolean): void {
        this.server.to(gameId).emit(ActionJournalEvents.CombatEscapeAttemptJournal, {
            message: this.formatEscapeMessage(player, escapeSuccess),
            involvedPlayers: [player._id],
        });
    }

    tooManyEscapeAttemptsEvent(gameId: string, player: Player): void {
        this.server.to(gameId).emit(ActionJournalEvents.CombatEscapeAttemptJournalFailed, {
            message: `${player.name} a déjà tenté de s'échapper 2 fois et ne peut plus fuir.`,
            involvedPlayers: [player._id],
        });
    }

    attackEvent(gameId: string, attackerId: string, targetId: string, attackResult: AttackResult): void {
        this.server.to(gameId).emit(ActionJournalEvents.AttackJournalResult, {
            message: this.formatAttackMessage(attackResult),
            involvedPlayers: [attackerId, targetId],
        });
    }

    nextTurnEvent(gameId: string, playerName: string, nextPlayerId: string): void {
        this.server.to(gameId).emit(ActionJournalEvents.TurnJournalTransition, {
            message: `${playerName} commence son tour.`,
            involvedPlayers: [nextPlayerId],
        });
    }

    combatEndedEvent(gameId: string, winnerId: string, winnerName: string): void {
        this.server
            .to(gameId)
            .emit(ActionJournalEvents.CombatJournalEnded, { message: `${winnerName} a gagné le combat.`, involvedPlayers: [winnerId] });
    }

    pickupItemEvent(gameId: string, player: Player, itemName: string): void {
        const frenchItemName = ITEM_LABELS_FR[itemName] || itemName;
        this.server.to(gameId).emit(ActionJournalEvents.ItemPickedUp, {
            message: `${player.name} a ramassé ${frenchItemName}.`,
            involvedPlayers: [player._id],
        });
    }

    private formatEscapeMessage(player: Player, success: boolean): string {
        const attemptNumber = player.escapesAttempts;

        let message = `${player.name} tente de s'échapper (tentative ${attemptNumber}/2).\n`;

        if (success) {
            message += 'Tentative réussie! Le combat est terminé.';
        } else {
            message += 'Tentative échouée! Le combat continue.';
        }

        return message;
    }

    private formatAttackMessage(attackResult: AttackResult): string {
        const { attacker, target, attackValue, defenseValue } = attackResult;

        let message = `${attacker.name} attaque ${target.name}.\n`;
        message += `Jet d'attaque: ${attackValue} (base ${MIN_POWER} + bonus ${attackValue - MIN_POWER})\n`;
        message += `Jet de défense: ${defenseValue} (base ${MIN_POWER} + bonus ${defenseValue - MIN_POWER})\n`;

        const damage = Math.max(0, attackValue - defenseValue);
        message += `Dégâts: ${damage}\n`;
        message += `Points de vie de ${target.name}: ${target.healthPower}/${target.maxHealthPower}\n`;

        return message;
    }
}
