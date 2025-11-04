import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LobbyCodeComponent } from '@app/components/lobby-page-components/lobby-code/lobby-code.component';
import { LobbyGridComponent } from '@app/components/lobby-page-components/lobby-grid/lobby-grid.component';
import { PlayerBannerListComponent } from '@app/components/lobby-page-components/player-banner-list/player-banner-list.component';
import { GameService } from '@app/services/game/game.service';
import { PlayerStateService } from '@app/services/player-state/player-state.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { GameModes } from '@common/game/game-enums';
import { MIN_PLAYERS } from '@common/game/game-info';
import { LobbyGatewayEvents } from '@common/events/gateway-events';
import { Lobby } from '@common/lobby/lobby-info';
import { PlayerInfo } from '@common/player/player-info';
import { Subscription } from 'rxjs';
import { ChampChatComponent } from '@app/components/general-components/chat/champ-chat.component';
@Component({
    selector: 'app-lobby-page',
    templateUrl: './lobby-page.component.html',
    styleUrls: ['./lobby-page.component.scss'],
    imports: [PlayerBannerListComponent, LobbyGridComponent, LobbyCodeComponent, CommonModule, RouterModule, ChampChatComponent],
})
export class LobbyPageComponent implements OnInit, OnDestroy {
    isLeader: boolean | null = false;
    _id: string | null = '';
    gameMode: GameModes;
    size: string;
    gridName: string;
    description: string;
    thumbnail: string = '';
    playerInfo: PlayerInfo[] = [];
    roomCode: string;
    maxPlayers: number;
    isVisionLeader: boolean;
    isLocked: boolean;
    isChatOpen = false;

    protected manuallyLocked = false;
    private currentLobby: Lobby;
    private mapId: string;
    private readonly subscription = new Subscription();

    private readonly router = inject(Router);
    private readonly snackBarService = inject(SnackBarService);

    constructor(
        private readonly changeDetectorRef: ChangeDetectorRef,
        private readonly gameStateService: GameStateService,
        private readonly gameService: GameService,
        private readonly lobbyService: LobbyService,
        private readonly playerStateService: PlayerStateService,
    ) {}

    ngOnInit(): void {
        if (!this.lobbyService.isSocketAlive()) {
            this.router.navigate(['/home']);
            return;
        }

        this.subscription.add(
            this.playerStateService.lobbyData$.subscribe((lobbyData) => {
                if (lobbyData) {
                    this.handleLobbyData(lobbyData);
                }
            }),
        );

        this.lobbyService.on(LobbyGatewayEvents.ChampSelectSubmitted, async (currentLobby: Lobby) => {
            this.handleLobbyData(currentLobby);
        });

        this.lobbyService.on(LobbyGatewayEvents.PlayerJoined, async (currentLobby: Lobby) => {
            this.snackBarService.showSnackBarPositive('Un joueur a rejoint la partie.');
            this.handleLobbyData(currentLobby);
        });

        this.lobbyService.on(LobbyGatewayEvents.BotAdded, async (currentLobby: Lobby) => {
            this.snackBarService.showSnackBarPositive('Un bot a été rajouté.');
            this.handleLobbyData(currentLobby);
        });

        this.lobbyService.on(LobbyGatewayEvents.PlayerLeft, async (currentLobby: Lobby) => {
            this.snackBarService.showSnackBar('Un joueur a quitté la partie.');

            if (currentLobby.locked && currentLobby.players.length === this.maxPlayers - 1) {
                if (this.isVisionLeader) {
                    this.snackBarService.showSnackBarPositive("Le lobby n'est plus plein et a été déverrouillé.");
                    currentLobby.locked = false;
                    this.isLocked = false;
                    this.currentLobby.locked = false;
                    this.lobbyService.toggleLockLobby(false);
                }
            }

            this.handleLobbyData(currentLobby);
        });

        this.lobbyService.on(LobbyGatewayEvents.LeaderLeft, async () => {
            this.snackBarService.showSnackBar('Le leader a quitté la partie.');
            this.router.navigate(['/home']);
            this.lobbyService.leaveLobby();
        });

        this.lobbyService.on(LobbyGatewayEvents.KickPlayer, async (currentLobby: Lobby) => {
            if (!this.isLocked && currentLobby.locked) {
                currentLobby.locked = false;
            }
            this.handleLobbyData(currentLobby);
        });

        this.lobbyService.on(LobbyGatewayEvents.Kicked, async () => {
            this.snackBarService.showSnackBar('Vous avez été expulsé de la partie.');
            this.router.navigate(['/home']);
            this.lobbyService.leaveLobby();
        });

        this.lobbyService.on(LobbyGatewayEvents.StartGame, async () => {
            this.router.navigate(['/game', this.roomCode]);
        });
    }

    toggleChat(): void {
        this.isChatOpen = !this.isChatOpen;
    }

    ngOnDestroy(): void {
        this.subscription.unsubscribe();
    }

    toggleLockRoom(): void {
        if (this.currentLobby.locked && this.playerInfo.length === this.maxPlayers) {
            this.snackBarService.showSnackBar('Impossible de déverrouiller un lobby complet.');
            return;
        }

        this.currentLobby.locked = !this.currentLobby.locked;
        this.isLocked = this.currentLobby.locked;
        this.manuallyLocked = this.currentLobby.locked;
        this.lobbyService.toggleLockLobby(this.currentLobby.locked);
    }

    lockRoom(): void {
        this.currentLobby.locked = true;
        this.isLocked = true;
        this.manuallyLocked = false;
        this.lobbyService.toggleLockLobby(true);
    }

    startGame(): void {
        if (!this.currentLobby.locked) {
            this.snackBarService.showSnackBar('Le lobby doit être verrouillé pour démarrer le jeu.');
            return;
        }

        if (this.playerInfo.length < MIN_PLAYERS) {
            this.snackBarService.showSnackBar('Le lobby doit avoir au moins ' + MIN_PLAYERS + ' joueurs pour démarrer le jeu.');
            return;
        }

        if (this.gameMode === GameModes.CTF && this.playerInfo.length % 2 !== 0) {
            this.snackBarService.showSnackBar('Le mode de jeu CTF nécessite un nombre pair de joueurs.');
            return;
        }

        this.createGame().then(() => {
            this.lobbyService.startGame();
        });
    }

    goBackToChampionSelection(): void {
        this.lobbyService.championDeselected();
        this.router.navigate(['/champ-select']);
    }

    private async handleLobbyData(currentLobby: Lobby): Promise<void> {
        this.playerInfo = currentLobby.players;
        this.mapId = currentLobby.mapId;
        this.roomCode = currentLobby.code;
        this.maxPlayers = currentLobby.maxPlayers;
        this.currentLobby = currentLobby;
        this.isLocked = currentLobby.locked;

        const currentPlayerId = this.lobbyService.getSocketId();
        const leaderPlayer = this.playerInfo.find((player) => player.isLeader);
        this.isVisionLeader = leaderPlayer ? leaderPlayer._id === currentPlayerId : false;

        if (this.isVisionLeader && this.playerInfo.length === this.maxPlayers && !this.currentLobby.locked) {
            this.snackBarService.showSnackBarPositive('Le lobby est plein et a été automatiquement verrouillé.');
            this.lockRoom();
        }

        if (this.mapId) {
            const fetchedGame = await this.gameService.getGameById(this.mapId).toPromise();
            if (fetchedGame) {
                this.gameMode = fetchedGame.gameMode;
                this.size = fetchedGame.gameGrid.size;
                this.gridName = fetchedGame.name;
                this.description = fetchedGame.description;
                this.thumbnail = fetchedGame.thumbnail;
            }
        }
        this.changeDetectorRef.detectChanges();
    }

    private async createGame() {
        const gameConfig = {
            id: this.roomCode,
            mapId: this.mapId,
            players: this.playerInfo,
        };

        return await this.gameStateService.createGame(gameConfig);
    }
}
