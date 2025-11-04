import { Component, OnDestroy, OnInit } from '@angular/core';
import { PlayerInfosComponent } from '@app/components/game-page-components/player-infos/player-infos.component';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-player-list',
    imports: [PlayerInfosComponent],
    templateUrl: './player-list.component.html',
    styleUrl: './player-list.component.scss',
})
export class PlayerListComponent implements OnInit, OnDestroy {
    playersList: Player[] = [];
    private playerSubscription: Subscription;

    constructor(
        private playerService: PlayerService,
        private gameStateService: GameStateService,
    ) {}

    get players() {
        return this.playerService.players;
    }

    ngOnInit() {
        this.playerSubscription = this.playerService.players$.subscribe((players) => {
            this.playersList = players;
        });

        this.setupSocketListeners();
    }

    ngOnDestroy() {
        this.removeSocketListeners();
        if (this.playerSubscription) {
            this.playerSubscription.unsubscribe();
        }
    }

    private setupSocketListeners() {
        this.gameStateService.on(GameGatewayEvents.CombatEnded, () => {
            this.gameStateService.getPlayers().then((players) => {
                this.playerService.updatePlayer(players);
            });
        });

        this.gameStateService.on(GameGatewayEvents.PlayersUpdated, () => {
            this.gameStateService.getPlayers().then((players) => {
                this.playerService.updatePlayer(players);
            });
        });

        this.gameStateService.on(GameGatewayEvents.TurnChanged, (playerId: string) => {
            this.playerService.setCurrentTurnPlayerId(playerId);
        });
    }

    private removeSocketListeners() {
        this.gameStateService.off(GameGatewayEvents.CombatEnded);
        this.gameStateService.off(GameGatewayEvents.PlayersUpdated);
        this.gameStateService.off(GameGatewayEvents.TurnChanged);
    }
}
