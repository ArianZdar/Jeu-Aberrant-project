import { Component, OnInit, OnDestroy } from '@angular/core';
import { CHAMPIONS } from '@app/constants/champions';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { Subscription } from 'rxjs';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { LobbyGatewayEvents } from '@common/events/gateway-events';

@Component({
    selector: 'app-champion-list',
    templateUrl: './champion-list.component.html',
    styleUrls: ['./champion-list.component.scss'],
})
export class ChampionListComponent implements OnInit, OnDestroy {
    champions = CHAMPIONS;
    currentIndex: number | null = null;
    selectedByOthers: number[] = [];
    private championIndexSubscription!: Subscription;

    constructor(
        private championIndexService: ChampionIndexService,
        private lobbyService: LobbyService,
    ) {}

    ngOnInit(): void {
        this.championIndexSubscription = this.championIndexService.currentIndex$.subscribe((index) => {
            this.currentIndex = index;
        });

        this.lobbyService.on(LobbyGatewayEvents.ChampionSelected, (data: { championsIndex: number[] }) => {
            this.selectedByOthers = data.championsIndex.filter((index) => index !== this.currentIndex);
            this.updateDisabledChampions();
        });
        this.lobbyService.getSelectedChampions();
    }

    ngOnDestroy(): void {
        this.championIndexSubscription.unsubscribe();
        this.lobbyService.off(LobbyGatewayEvents.ChampionSelected);
    }

    selectChampion(index: number): void {
        if (!this.isChampionDisabled(index)) {
            const oldIndex = this.currentIndex;
            this.championIndexService.setCurrentIndex(index);
            if (oldIndex !== null) {
                this.lobbyService.championSelected(index, oldIndex);
            } else {
                this.lobbyService.championSelected(index);
            }
        }
    }

    isChampionDisabled(index: number): boolean {
        return this.selectedByOthers.includes(index);
    }

    private updateDisabledChampions(): void {
        this.championIndexService.setDisabledChampions([...this.selectedByOthers]);
    }
}
