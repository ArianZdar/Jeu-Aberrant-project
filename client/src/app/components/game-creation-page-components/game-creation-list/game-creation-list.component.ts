import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { GameCreationComponent } from '@app/components/game-creation-page-components/game-creation/game-creation.component';
import { GameService } from '@app/services/game/game.service';
import { GameInfo } from '@common/game/game-info';
import { LoadingComponent } from '@app/components/general-components/loading/loading.component';

@Component({
    selector: 'app-game-creation-list',
    imports: [GameCreationComponent, RouterLink, LoadingComponent],
    templateUrl: './game-creation-list.component.html',
    styleUrl: './game-creation-list.component.scss',
})
export class GameCreationListComponent implements OnInit {
    games: GameInfo[] = [];
    gameThumbnails: Record<string, string> = {};
    loading = true;

    constructor(private gameService: GameService) {}

    ngOnInit(): void {
        this.fetchGames();
    }

    fetchGames(): void {
        this.gameService.getGamesInfo().subscribe({
            next: (data: GameInfo[]) => {
                this.games = data
                    .filter((game) => !game.isHidden)
                    .sort((a, b) => new Date(b.lastChange).getTime() - new Date(a.lastChange).getTime());
                this.loading = false;
            },
        });
    }
}
