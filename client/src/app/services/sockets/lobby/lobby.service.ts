import { Injectable } from '@angular/core';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { CommonGatewayEvents, LobbyGatewayEvents } from '@common/events/gateway-events';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { io, Socket } from 'socket.io-client';
import { environment } from 'src/environments/environment';
import { ChatMessage } from '@common/game/message';
import { CreateGameInterface, JoinLobbyResponseInterface } from '@common/events/data-interface';

@Injectable({
    providedIn: 'root',
})
export class LobbyService {
    private socket: Socket;

    constructor(
        private readonly playerStateService: PlayerStateService,
        private readonly snackBarService: SnackBarService,
    ) {
        this.connect();
    }

    toggleLockLobby(isLocked: boolean): void {
        this.socket.emit(LobbyGatewayEvents.ToggleLockLobby, isLocked);
    }

    createRoom(data: CreateGameInterface): void {
        this.socket.emit(LobbyGatewayEvents.CreateRoom, data);
    }

    async joinLobby(pin: string): Promise<JoinLobbyResponseInterface> {
        return new Promise((resolve) => {
            this.socket.emit(LobbyGatewayEvents.JoinLobby, pin);
            this.socket.once(LobbyGatewayEvents.JoinLobby, (response: { hasJoinedLobby: boolean; lobby: Lobby }) => {
                if (response.hasJoinedLobby) {
                    this.playerStateService.setLobbyData(response.lobby);
                }
                resolve(response);
            });

            this.socket.once(LobbyGatewayEvents.ErrorLobby, (response: JoinLobbyResponseInterface) => {
                resolve(response);
            });
        });
    }

    async startGame(): Promise<void> {
        return new Promise((resolve) => {
            this.socket.emit(LobbyGatewayEvents.StartGame);
            this.socket.once(LobbyGatewayEvents.StartGame, () => {
                resolve();
            });
        });
    }

    async isLobbyFull(playerInfo: PlayerInfo): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket.emit(LobbyGatewayEvents.IsLobbyFull, playerInfo);
            this.socket.once(LobbyGatewayEvents.IsLobbyFull, (isFull: boolean) => {
                resolve(isFull);
            });
        });
    }

    async isLobbyLocked(playerInfo: PlayerInfo): Promise<boolean> {
        return new Promise((resolve) => {
            this.socket.emit(LobbyGatewayEvents.IsLobbyLocked, playerInfo);
            this.socket.once(LobbyGatewayEvents.IsLobbyLocked, (isLocked: boolean) => {
                resolve(isLocked);
            });
        });
    }

    sendChatHistoryRequest(lobbyId: string): void {
        this.socket.emit(CommonGatewayEvents.ChatHistory, lobbyId);
    }

    sendMessage(message: ChatMessage) {
        this.socket.emit(CommonGatewayEvents.RoomMessage, message);
    }

    kickPlayer(playerName: string): void {
        this.snackBarService.showSnackBar(`Le joueur ${playerName} a été expulsé de la partie.`);
        this.socket.emit(LobbyGatewayEvents.KickPlayer, playerName);
    }

    isSocketAlive(): boolean {
        return this.socket?.connected || false;
    }

    leaveLobby(): void {
        this.socket.emit(LobbyGatewayEvents.LeaveLobby);
    }

    championSelected(index: number, oldIndex?: number): void {
        if (oldIndex === undefined) {
            this.socket.emit(LobbyGatewayEvents.ChampionSelected, { index });
            return;
        }
        this.socket.emit(LobbyGatewayEvents.ChampionSelected, { index, oldIndex });
    }

    championDeselected(): void {
        this.socket.emit(LobbyGatewayEvents.ChampionDeselected);
    }

    getSelectedChampions(): void {
        this.socket.emit(LobbyGatewayEvents.GetSelectedChampions);
    }

    addBot(isAggressive: boolean): void {
        this.socket.emit(LobbyGatewayEvents.AddBot, isAggressive);
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.playerStateService.clearState();
        }
    }

    getSocket(): Socket {
        return this.socket;
    }

    getSocketId(): string {
        return this.socket?.id ?? '';
    }

    on<T>(event: string, action: (data: T) => void): void {
        this.socket.on(event, action);
    }

    off<Ev extends string>(event: Ev): Socket {
        return this.socket.off(event);
    }

    connect(): void {
        this.socket = io(`${environment.socketUrl}/lobby`, {
            transports: ['websocket'],
            upgrade: false,
        });
    }
}
