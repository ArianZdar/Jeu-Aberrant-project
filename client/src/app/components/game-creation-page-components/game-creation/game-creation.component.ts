import { Component, Input } from '@angular/core';
import { GameStatusValidationService } from '@app/services/game-status-validation/game-status-validation.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { CreateGameInterface } from '@common/events/data-interface';

@Component({
    selector: 'app-game-creation',
    templateUrl: './game-creation.component.html',
    styleUrl: './game-creation.component.scss',
})
export class GameCreationComponent {
    @Input() image: string = '';
    @Input() name: string = '';
    @Input() size: string = '';
    @Input() mode: string = '';
    @Input() isHidden: boolean = true;
    @Input() description: string = '';
    @Input() _id: string = '';

    isDescriptionExpanded = false;
    private isLocked = false;

    private sizeMap: { [key: string]: number } = {
        small: 2,
        medium: 4,
        large: 6,
    };

    constructor(
        private gameStatusValidationService: GameStatusValidationService,
        private lobbyService: LobbyService,
    ) {}

    toggleDescription(): void {
        this.isDescriptionExpanded = !this.isDescriptionExpanded;
    }

    valid(): void {
        this.gameStatusValidationService.validation(this._id, 'gameCreation');
        const data: CreateGameInterface = { mapId: this._id, maxPlayers: this.sizeMap[this.size], isLocked: this.isLocked };
        this.lobbyService.createRoom(data);
    }
}
