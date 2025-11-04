import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChampDisplayComponent } from '@app/components/champion-selection-page-components/champ-display/champ-display.component';
import { ChampInfoComponent } from '@app/components/champion-selection-page-components/champ-info/champ-info.component';
import { ChampionListComponent } from '@app/components/champion-selection-page-components/champion-list/champion-list.component';
import { CHAMPIONS, Champion } from '@app/constants/champions';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';

@Component({
    selector: 'app-champion-selection',
    templateUrl: './champion-selection.component.html',
    styleUrls: ['./champion-selection.component.scss'],
    imports: [ChampDisplayComponent, ChampionListComponent, ChampInfoComponent],
})
export class ChampionSelectionComponent implements OnInit {
    champions: Champion[] = CHAMPIONS;

    constructor(
        private router: Router,
        private lobbyService: LobbyService,
        private championIndexService: ChampionIndexService,
        private gameStateService: GameStateService,
    ) {}

    leaveLobby() {
        this.championIndexService.quitChampionSelection();
        this.lobbyService.leaveLobby();
        this.router.navigate(['/home']);
    }

    async ngOnInit(): Promise<void> {
        this.championIndexService.resetIndex();

        if (!this.lobbyService.isSocketAlive()) {
            this.router.navigate(['/home']);
            return;
        }

        this.gameStateService.rebindSocketId();
    }
}
