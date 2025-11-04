import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, NavigationStart, Router } from '@angular/router';
import { CombatViewComponent } from '@app/components/game-page-components/combat-view/combat-view.component';
import { GameGridComponent } from '@app/components/game-page-components/game-grid/game-grid.component';
import { PlayerListComponent } from '@app/components/game-page-components/player-list/player-list.component';
import { PlayerSidebarComponent } from '@app/components/game-page-components/player-sidebar/player-sidebar.component';
import { SurrenderDialogComponent } from '@app/components/game-page-components/surrender-dialog/surrender-dialog.component';
import { MESSAGE_HOVER_MARGIN } from '@app/constants/client-constants';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { Teams } from '@common/game/game-enums';
import { DELAY_BEFORE_RETURNING_TO_HOME_PAGE } from '@common/game/game-info';
import { GameGatewayEvents, LobbyGatewayEvents } from '@common/events/gateway-events';
import { Subject, Subscription } from 'rxjs';
import { ChatService } from '@app/services/chat/chat.service';
import { ChampChatComponent } from '@app/components/general-components/chat/champ-chat.component';
@Component({
    selector: 'app-game-page',
    imports: [PlayerListComponent, PlayerSidebarComponent, GameGridComponent, ChampChatComponent, CombatViewComponent, CommonModule],
    templateUrl: './game-page.component.html',
    styleUrl: './game-page.component.scss',
})
export class GamePageComponent implements OnInit, OnDestroy {
    @ViewChild('attackMessage') attackMessageElement: ElementRef;

    initializationFinished = false;
    showCombatView = false;
    isAttackModeActive = false;
    isDebugActive$ = this.gameStateService.isDebugActive$;
    shouldHideMessage = false;
    private routerSubscription: Subscription;
    private navigationSubscription: Subscription;
    private gameId: string;
    private buttonPressed: string;

    private dialog = inject(MatDialog);
    private lobbyService = inject(LobbyService);
    private combatService = inject(CombatService);
    private destroy$ = new Subject<void>();

    private snackBarService = inject(SnackBarService);
    private chatService = inject(ChatService);

    constructor(
        private router: Router,
        private playerService: PlayerService,
        private gameGridService: GameGridService,
        private route: ActivatedRoute,
        private gameStateService: GameStateService,
    ) {}

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.attackMessageElement?.nativeElement || !this.isAttackModeActive) return;

        const rect = this.attackMessageElement.nativeElement.getBoundingClientRect();

        this.shouldHideMessage =
            event.clientX >= rect.left - MESSAGE_HOVER_MARGIN &&
            event.clientX <= rect.right + MESSAGE_HOVER_MARGIN &&
            event.clientY >= rect.top - MESSAGE_HOVER_MARGIN &&
            event.clientY <= rect.bottom + MESSAGE_HOVER_MARGIN;
    }

    @HostListener('document:keypress', ['$event'])
    buttonDetect(event: KeyboardEvent) {
        const target = event.target as HTMLElement;

        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        this.buttonPressed = event.key;
        if (this.buttonPressed === 'd') {
            this.gameStateService.activateDebugMode();
        }
    }

    ngOnInit() {
        this.lobbyService.off(LobbyGatewayEvents.LeaderLeft);
        this.lobbyService.off(LobbyGatewayEvents.PlayerLeft);

        if (!this.gameStateService.isSocketAlive()) {
            this.router.navigate(['/home']);
            return;
        }

        this.navigationSubscription = this.router.events.subscribe((event) => {
            if (event instanceof NavigationStart && !event.url.includes('/home')) {
                this.gameStateService.leaveGame();
                this.navigationSubscription.unsubscribe();
                this.router.navigate(['/home']);
            }
        });

        this.combatService.showCombatView$.subscribe((show) => {
            this.showCombatView = show;
        });

        this.combatService.attackMode$.subscribe((active) => {
            this.isAttackModeActive = active;
        });

        this.setupUi();

        this.gameStateService.on(GameGatewayEvents.TurnChanged, (playerId: string) => {
            const mainPlayer = this.playerService.getMainPlayer();
            const isMyTurn = playerId === this.playerService.getMainPlayerId();
            this.playerService.isCurrentPlayerTurn = isMyTurn;

            if (!isMyTurn && this.combatService.getAttackModeValue()) {
                this.combatService.setAttackMode(false);
            }

            if (isMyTurn && mainPlayer) {
                this.gameGridService.updateReachableTiles();
                this.gameStateService.getPlayers().then((players) => {
                    this.playerService.updatePlayer(players);
                });
            }
        });

        this.gameStateService.on(GameGatewayEvents.TimerTick, (seconds: number) => {
            this.playerService.updateTurnTimer(seconds);

            const player = this.playerService.getMainPlayer();

            if (player && seconds <= 1) {
                if (player.items.length > 2) {
                    this.gameStateService.pauseTurnTimer(this.gameGridService.getGameId());
                }
            }
        });

        this.gameStateService.on(GameGatewayEvents.TeamWon, (team: Teams) => {
            this.snackBarService.showSnackBarPositive("L'équipe " + team + ' a gagné la partie !');
            this.gameStateService.pauseTurnTimer(this.gameId);
            setTimeout(() => {
                this.gameStateService.leaveGame();
                this.router.navigate(['/home']);
            }, DELAY_BEFORE_RETURNING_TO_HOME_PAGE);
        });

        this.gameStateService.on(GameGatewayEvents.PlayerWonGame, (playerName: string) => {
            this.snackBarService.showSnackBarPositive('Le joueur ' + playerName + ' a gagné la partie !');
            this.gameStateService.pauseTurnTimer(this.gameId);
            setTimeout(() => {
                this.gameStateService.leaveGame();
                this.router.navigate(['/home']);
            }, DELAY_BEFORE_RETURNING_TO_HOME_PAGE);
        });

        this.gameStateService.on(GameGatewayEvents.FightWon, (data: { playerId: string; wins: number }) => {
            this.playerService.updatePlayerFightWins(data.playerId, data.wins);
        });

        this.gameStateService.on(GameGatewayEvents.LastPlayerConnected, () => {
            this.snackBarService.showSnackBarPositive("Tout le monde a quitté la partie! Redirection vers la page d'accueil.");
            this.gameStateService.leaveGame();
            this.router.navigate(['/home']);
        });

        this.gameStateService.on(GameGatewayEvents.ToggleDebug, (isDebugModeActive: boolean) => {
            this.gameStateService.setIsDebugActive(isDebugModeActive);
        });

        this.gameStateService.on(GameGatewayEvents.DeactivateDebug, () => {
            this.gameStateService.setIsDebugActive(false);
        });

        this.lobbyService.leaveLobby();
    }

    ngOnDestroy() {
        if (this.routerSubscription) {
            this.routerSubscription.unsubscribe();
        }
        if (this.navigationSubscription) {
            this.navigationSubscription.unsubscribe();
        }
        this.gameStateService.off(GameGatewayEvents.TurnChanged);
        this.gameStateService.off(GameGatewayEvents.TimerTick);
        this.gameStateService.off(GameGatewayEvents.FightWon);
        this.gameStateService.off(GameGatewayEvents.ToggleDebug);
        this.gameStateService.off(GameGatewayEvents.DeactivateDebug);
        this.gameStateService.off(GameGatewayEvents.TeamWon);
        this.destroy$.next();
        this.destroy$.complete();

        this.playerService.reset();
        this.combatService.reset();
        this.gameGridService.reset();
        this.gameStateService.reset();
        this.chatService.resetToLobbyMode();
    }

    async setupUi() {
        this.gameId = this.route.snapshot.paramMap.get('roomId') ?? '';
        this.gameGridService.setGameId(this.gameId);

        await this.gameStateService.joinGame(this.gameId);

        this.chatService.enterAGame();

        const mapId = await this.gameStateService.getMapId();
        const players = await this.gameStateService.getPlayers();
        const items = await this.gameStateService.getItems();

        this.playerService.setPlayers(players);
        this.gameGridService.setItems(items);

        const mainPlayerId = this.playerService.getMainPlayerId();
        if (mainPlayerId) {
            this.gameGridService.setPlayerId(mainPlayerId);
        }

        const currentTurnPlayerIdFromServer = await this.playerService.getCurrentTurnPlayerIdValue();

        if (currentTurnPlayerIdFromServer) {
            this.playerService.setCurrentTurnPlayerId(currentTurnPlayerIdFromServer);

            const isMyTurn = currentTurnPlayerIdFromServer === mainPlayerId;
            this.playerService.isCurrentPlayerTurn = isMyTurn;

            if (isMyTurn) {
                this.gameGridService.updateReachableTiles();
            }
        }

        await this.gameGridService.setTilesByGameId(mapId);
        this.initializationFinished = true;
    }

    onSurrenderClick() {
        const dialogRef = this.dialog.open(SurrenderDialogComponent, {
            width: '30vw',
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result) {
                this.router.navigate(['/home']);
            }
        });
    }

    getLevelTitle(): string {
        return this.gameGridService.getTitle();
    }

    getLevelSize(): string {
        return this.gameGridService.getSize();
    }

    onBackgroundClick(): void {
        if (this.combatService.getAttackModeValue()) {
            this.combatService.setAttackMode(false);
        }
    }
}
