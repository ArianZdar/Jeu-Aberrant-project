import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { GameService } from '@app/services/game/game.service';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { Pages } from '@app/constants/client-constants';

@Injectable({
    providedIn: 'root',
})
export class GameStatusValidationService {
    constructor(
        private router: Router,
        private gameService: GameService,
        private snackBarService: SnackBarService,
    ) {}

    validation(gameId: string, actualPage: string): void {
        this.gameService.getGameById(gameId).subscribe({
            next: (fetchedGame) => {
                if (!fetchedGame) {
                    this.snackBarService.showSnackBar('Le jeu à été supprimé.');
                } else if (fetchedGame.isHidden) {
                    this.snackBarService.showSnackBar("La visibilité du jeu a été changée, ce dernier n'est plus accessible.");
                } else {
                    switch (actualPage) {
                        case Pages.GameCreation:
                            this.router.navigate(['/champ-select']);
                            break;
                        case Pages.ChampSelect:
                            this.router.navigate(['/lobby']);
                            break;
                    }
                }
            },
        });
    }
}
