import { EventEmitter, Injectable } from '@angular/core';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { ChampSelectEvents } from '@app/constants/client-constants';

@Injectable({
    providedIn: 'root',
})
export class ChampSelectService {
    champSelectSubmitted = new EventEmitter<PlayerInfo>();
    champSelectError = new EventEmitter<{ message: string }>();

    constructor(
        public lobbyService: LobbyService,
        private playerStateService: PlayerStateService,
    ) {
        this.lobbyService.getSocket().on(ChampSelectEvents.ChampSelectSubmitted, (playerInfo: PlayerInfo) => {
            this.handleChampSelectSubmitted(playerInfo);
        });

        this.lobbyService.getSocket().on(ChampSelectEvents.ChampSelectSubmitted, (lobby: Lobby) => {
            this.playerStateService.setLobbyData(lobby);
        });

        this.lobbyService.getSocket().on(ChampSelectEvents.ChampSelectError, (error: { message: string }) => {
            this.champSelectError.emit(error);
        });
    }

    submitChampSelect(playerInfo: PlayerInfo): void {
        this.playerStateService.setPlayerInfo(playerInfo);
        this.lobbyService.getSocket().emit(ChampSelectEvents.SubmitChampSelect, playerInfo);
    }

    async isRoomFull(playerInfo: PlayerInfo): Promise<boolean> {
        return this.lobbyService.isLobbyFull(playerInfo);
    }

    async isRoomLocked(playerInfo: PlayerInfo): Promise<boolean> {
        return this.lobbyService.isLobbyLocked(playerInfo);
    }

    private handleChampSelectSubmitted(playerInfo: PlayerInfo): void {
        this.champSelectSubmitted.emit(playerInfo);
    }
}
