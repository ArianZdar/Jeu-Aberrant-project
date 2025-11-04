// Les Behavior private/protected doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class PlayerStateService {
    private playerInfoSource = new BehaviorSubject<PlayerInfo | null>(null);
    private connectedUsersSource = new BehaviorSubject<string[]>([]);
    protected connectedUsers$ = this.connectedUsersSource.asObservable();
    private lobbyDataSource = new BehaviorSubject<Lobby | null>(null);
    lobbyData$ = this.lobbyDataSource.asObservable();
    playerInfo$ = this.playerInfoSource.asObservable();

    setPlayerInfo(info: PlayerInfo): void {
        this.playerInfoSource.next(info);
    }

    setLobbyData(lobby: Lobby): void {
        this.lobbyDataSource.next(lobby);
    }

    getLobbyData(): Lobby | null {
        return this.lobbyDataSource.getValue();
    }

    addConnectedUser(userId: string): void {
        const currentUsers = this.connectedUsersSource.getValue();
        if (!currentUsers.includes(userId)) {
            this.connectedUsersSource.next([...currentUsers, userId]);
        }
    }

    clearState(): void {
        this.playerInfoSource.next(null);
        this.lobbyDataSource.next(null);
    }
}
