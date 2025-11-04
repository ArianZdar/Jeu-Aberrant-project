import { Component, OnInit } from '@angular/core';
import { GameCreationListComponent } from '@app/components/game-creation-page-components/game-creation-list/game-creation-list.component';
import { HeaderBarComponent } from '@app/components/general-components/header-bar/header-bar.component';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';

@Component({
    selector: 'app-game-creation-page',
    templateUrl: './game-creation-page.component.html',
    styleUrl: './game-creation-page.component.scss',
    imports: [GameCreationListComponent, HeaderBarComponent],
})
export class GameCreationPageComponent implements OnInit {
    constructor(private lobbyService: LobbyService) {}

    ngOnInit(): void {
        this.lobbyService.leaveLobby();
    }
}
