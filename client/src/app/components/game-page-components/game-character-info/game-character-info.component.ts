import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActionCountersComponent } from '@app/components/game-page-components/action-counters/action-counters.component';
import { GameActionsComponent } from '@app/components/game-page-components/game-actions/game-actions.component';
import { Player } from '@common/player/player';
import { PlayerService } from '@app/services/player/player.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
    selector: 'app-game-character-info',
    imports: [GameActionsComponent, ActionCountersComponent],
    templateUrl: './game-character-info.component.html',
    styleUrl: './game-character-info.component.scss',
})
export class GameCharacterInfoComponent implements OnInit, OnDestroy {
    username: string = '';
    champion: string = '';
    mainPlayerInfos: Player;
    currentPlayer: Player;
    private destroy$ = new Subject<void>();

    constructor(private playerService: PlayerService) {}
    ngOnInit() {
        this.playerService
            .getMainPlayerStats()
            .pipe(takeUntil(this.destroy$))
            .subscribe((infos) => {
                this.currentPlayer = infos;
            });
    }

    ngOnDestroy() {
        this.destroy$.next();
        this.destroy$.complete();
    }
}
