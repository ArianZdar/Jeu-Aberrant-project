import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { DeleteGameDialogComponent } from '@app/components/admin-page-components/delete-game-dialog/delete-game-dialog.component';
import { GamePreviewComponent } from '@app/components/admin-page-components/game-preview/game-preview.component';
import { LoadingComponent } from '@app/components/general-components/loading/loading.component';
import { GameService } from '@app/services/game/game.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { GameInfo } from '@common/game/game-info';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
    selector: 'app-game-list',
    templateUrl: './game-list.component.html',
    styleUrls: ['./game-list.component.scss'],
    imports: [GamePreviewComponent, LoadingComponent],
})
export class GameListComponent implements OnInit {
    games: GameInfo[] = [];
    gameThumbnails: Record<string, string> = {};
    loading = true;

    constructor(
        private readonly gameService: GameService,
        private readonly snackBarService: SnackBarService,
        private readonly dialog: MatDialog,
    ) {}

    ngOnInit(): void {
        this.fetchGames();
    }

    fetchGames(): void {
        this.gameService.getGamesInfo().subscribe({
            next: (data: GameInfo[]) => {
                this.games = data.sort((a, b) => new Date(b.lastChange).getTime() - new Date(a.lastChange).getTime());
                this.loading = false;
            },
        });
    }

    toggleIsHidden(game: GameInfo): void {
        this.gameService.getGameById(game._id).subscribe({
            next: (fetchedGame) => {
                if (fetchedGame.isHidden === game.isHidden) {
                    fetchedGame.isHidden = !fetchedGame.isHidden;
                }

                this.gameService.updateGame(fetchedGame).subscribe({
                    next: (updatedGame) => {
                        const index = this.games.findIndex((g) => g._id === updatedGame._id);
                        this.games[index] = updatedGame;
                    },
                });
            },
            error: () => {
                this.deleteGame(game);
                return;
            },
        });
    }

    deleteGame(game: GameInfo): void {
        const dialogRef = this.dialog.open(DeleteGameDialogComponent);

        dialogRef.afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
                this.gameService
                    .deleteGame(game)
                    .pipe(
                        catchError(() => {
                            this.snackBarService.showSnackBar('Le jeu a été supprimé.');
                            this.games = this.games.filter((g) => g._id !== game._id);
                            return of(null);
                        }),
                    )
                    .subscribe({
                        next: (deletedGame) => {
                            this.games = this.games.filter((g) => g._id !== (deletedGame ? deletedGame._id : game._id));
                        },
                    });
            }
        });
    }
}
