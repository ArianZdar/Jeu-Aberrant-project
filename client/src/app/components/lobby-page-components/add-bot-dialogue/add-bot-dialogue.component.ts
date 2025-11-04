import { Component } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';

@Component({
    selector: 'app-add-bot-dialogue',
    imports: [MatDialogModule],
    templateUrl: './add-bot-dialogue.component.html',
    styleUrl: './add-bot-dialogue.component.scss',
})
export class AddBotDialogueComponent {
    constructor(
        public dialogRef: MatDialogRef<AddBotDialogueComponent>,
        private readonly lobbyService: LobbyService,
    ) {}

    onClose(): void {
        this.dialogRef.close();
    }

    addAggressiveBot(): void {
        this.lobbyService.addBot(true);
        this.onClose();
    }

    addDefensiveBot(): void {
        this.lobbyService.addBot(false);
        this.onClose();
    }
}
