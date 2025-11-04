// Les Behavior private/protected doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { CommonGatewayEvents, ActionJournalEvents } from '@common/events/gateway-events';
import { BehaviorSubject, Subject } from 'rxjs';
import { GameStateService } from 'src/app/services/sockets/game-state/game-state.service';
import { ChatMessage, JournalMessage } from '@common/game/message';
import { LobbyService } from 'src/app/services/sockets/lobby/lobby.service';
import { PlayerStateService } from '@app/services/player-state/player-state.service';

@Injectable({
    providedIn: 'root',
})
export class ChatService {
    private isInGame: boolean;
    private messageSubject = new Subject<ChatMessage>();
    readonly messages$ = this.messageSubject.asObservable();
    private currentPlayerNameSubject = new BehaviorSubject<string>('Loading...');
    readonly currentPlayerName$ = this.currentPlayerNameSubject.asObservable();
    private journalMessagesSubject = new Subject<JournalMessage>();
    readonly journalMessages$ = this.journalMessagesSubject.asObservable();

    private currentPlayerId: string = '';

    constructor(
        private gameStateService: GameStateService,
        private lobbyService: LobbyService,
        private playerStateService: PlayerStateService,
    ) {
        this.isInGame = false;
        this.initializeCurrentPlayerName(lobbyService.getSocket().id || '');
        this.setupLobbyListeners();
    }

    resetToLobbyMode(): void {
        this.isInGame = false;
        this.cleanupListeners();
        this.setupLobbyListeners();
    }

    sendChatMessage(content: string): void {
        const message: ChatMessage = {
            timeStamp: new Date().toLocaleTimeString('en-Us', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            senderName: this.currentPlayerNameSubject.getValue(),
            senderId: '',
            content: content.trim(),
        };

        if (this.isInGame) {
            message.senderId = this.gameStateService.getSocket().id || '';
            this.gameStateService.sendMessage(message);
        } else {
            message.senderId = this.lobbyService.getSocket().id || '';
            this.lobbyService.sendMessage(message);
        }
    }

    enterAGame(): void {
        this.isInGame = true;
        this.lobbyService.off(CommonGatewayEvents.RoomMessage);
        this.lobbyService.off(CommonGatewayEvents.ChatHistory);
        this.setupGameListeners();
    }

    initializeCurrentPlayerName(playerName: string): void {
        this.currentPlayerNameSubject.next(playerName);
        this.playerStateService.playerInfo$.subscribe((playerInfo) => {
            if (playerInfo) {
                this.currentPlayerNameSubject.next(playerInfo.name);
            }
        });
    }

    getCurrentPlayerId(): string {
        if (!this.currentPlayerId) {
            this.currentPlayerId = this.gameStateService.getSocket().id || '';
        }
        return this.currentPlayerId;
    }

    requestLobbyChatHistory(): void {
        const lobbyData = this.playerStateService.getLobbyData();
        if (lobbyData && lobbyData.code) {
            this.lobbyService.sendChatHistoryRequest(lobbyData.code);
        }
    }

    private setupLobbyListeners(): void {
        this.lobbyService.on(CommonGatewayEvents.RoomMessage, (message: ChatMessage) => {
            this.handleMessage(message, this.lobbyService.getSocket().id || '');
        });
        this.lobbyService.on(CommonGatewayEvents.ChatHistory, (messages: ChatMessage[]) => {
            messages.forEach((message) => {
                this.handleMessage(message, this.lobbyService.getSocket().id || '');
            });
        });
    }

    private setupGameListeners(): void {
        this.gameStateService.on(CommonGatewayEvents.RoomMessage, (message: ChatMessage) => {
            this.handleMessage(message, this.gameStateService.getSocket().id || '');
        });

        this.gameStateService.on(CommonGatewayEvents.ChatHistory, (messages: ChatMessage[]) => {
            messages.forEach((message) => {
                this.handleMessage(message, this.gameStateService.getSocket().id || '');
            });
        });
        const lobbyData = this.playerStateService.getLobbyData();
        if (lobbyData && lobbyData.code) {
            this.gameStateService.sendChatHistoryRequest(lobbyData.code);
        }

        this.gameStateService.on(ActionJournalEvents.TurnJournalTransition, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.CombatJournal, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.CombatJournalEnded, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.ToggleDebugJournal, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.LeaveGameJournal, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.DoorToggleJournal, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });
        this.gameStateService.on(ActionJournalEvents.CombatEscapeAttemptJournal, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });
        this.gameStateService.on(ActionJournalEvents.CombatEscapeAttemptJournalFailed, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });
        this.gameStateService.on(ActionJournalEvents.AttackJournalResult, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.on(ActionJournalEvents.ItemPickedUp, (data: { message: string; involvedPlayers: string[] }) => {
            this.nextMessage(data);
        });

        this.gameStateService.firstPlayerTurn();
    }

    private nextMessage(data: { message: string; involvedPlayers: string[] }): void {
        this.journalMessagesSubject.next({
            timeStamp: new Date().toLocaleTimeString('en-Us', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            content: data.message,
            involvedPlayers: data.involvedPlayers,
        });
    }

    private cleanupListeners(): void {
        this.lobbyService.off(CommonGatewayEvents.RoomMessage);
        this.lobbyService.off(CommonGatewayEvents.ChatHistory);
        this.gameStateService.off(CommonGatewayEvents.RoomMessage);
        this.gameStateService.off(CommonGatewayEvents.ChatHistory);
        this.gameStateService.off(ActionJournalEvents.CombatJournal);
        this.gameStateService.off(ActionJournalEvents.CombatJournalEnded);
        this.gameStateService.off(ActionJournalEvents.ToggleDebugJournal);
        this.gameStateService.off(ActionJournalEvents.LeaveGameJournal);
        this.gameStateService.off(ActionJournalEvents.DoorToggleJournal);
        this.gameStateService.off(ActionJournalEvents.TurnJournalTransition);
        this.gameStateService.off(ActionJournalEvents.CombatEscapeAttemptJournal);
        this.gameStateService.off(ActionJournalEvents.CombatEscapeAttemptJournalFailed);
        this.gameStateService.off(ActionJournalEvents.AttackJournalResult);
        this.gameStateService.off(ActionJournalEvents.ItemPickedUp);
    }

    private handleMessage(message: ChatMessage, socketId: string) {
        const isFromCurrentUser = message.senderId === socketId;
        const enhancedMessage: ChatMessage = {
            ...message,
            senderName: isFromCurrentUser ? 'Vous' : message.senderName,
        };
        this.messageSubject.next(enhancedMessage);
    }
}
