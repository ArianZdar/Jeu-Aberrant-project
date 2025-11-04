import { Component, Input } from '@angular/core';
import { CHAMPIONS, Champion } from '@app/constants/champions';
import { MatDialog } from '@angular/material/dialog';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { AddBotDialogueComponent } from '@app/components/lobby-page-components/add-bot-dialogue/add-bot-dialogue.component';

@Component({
    selector: 'app-player-banner',
    templateUrl: './player-banner.component.html',
    styleUrls: ['./player-banner.component.scss'],
})
export class PlayerBannerComponent {
    @Input() playerName: string;
    @Input() isLeader: boolean | null = false;
    @Input() championIndex: string | null = '';
    @Input() isLeaderVision: boolean = false;
    @Input() isBot: boolean = false;
    champions: Champion[] = CHAMPIONS;

    constructor(
        private readonly lobbyService: LobbyService,
        private readonly dialog: MatDialog,
    ) {}

    get currentChampion(): Champion {
        return this.champions[this.championIndex ? parseInt(this.championIndex, 10) : 0];
    }

    kickPlayer(playerName: string): void {
        this.lobbyService.kickPlayer(playerName);
    }

    addBot(): void {
        this.dialog.open(AddBotDialogueComponent);
    }
}
