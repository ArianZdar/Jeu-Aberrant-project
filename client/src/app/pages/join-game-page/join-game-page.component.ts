import { Component, ElementRef, OnInit, QueryList, ViewChildren } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { PlayerInfo } from '@common/player/player-info';
import { CODE_LENGTH } from '@app/constants/client-constants';

@Component({
    selector: 'app-join-game-page',
    standalone: true,
    imports: [RouterModule],
    templateUrl: './join-game-page.component.html',
    styleUrls: ['./join-game-page.component.scss'],
})
export class JoinGamePageComponent implements OnInit {
    @ViewChildren('input1, input2, input3, input4') inputs!: QueryList<ElementRef>;
    codeDigits: string[] = Array(CODE_LENGTH).fill('');
    isCodeValid: boolean = false;
    roomExists: boolean = false;

    constructor(
        private router: Router,
        private lobbyService: LobbyService,
        private snackbarService: SnackBarService,
    ) {}

    ngOnInit(): void {
        this.lobbyService.leaveLobby();
    }

    onInput(event: Event, index: number) {
        const input = event.target as HTMLInputElement;
        const value = input.value;

        if (!/^\d*$/.test(value)) {
            input.value = this.codeDigits[index] || '';
            return;
        }

        if (value.length > 1) {
            input.value = value[0];
        }

        this.codeDigits[index] = input.value;

        if (input.value && index < CODE_LENGTH - 1) {
            setTimeout(() => {
                this.inputs.get(index + 1)?.nativeElement.focus();
            }, 0);
        }

        this.updateGameCode();
    }

    onEnter(event: KeyboardEvent, index: number) {
        if (event.key === 'Enter' && index === CODE_LENGTH - 1) {
            event.preventDefault();
            this.joinGame();
        }
    }

    onDelete(event: KeyboardEvent, index: number) {
        if (event.key === 'Backspace' && index > 0 && !this.codeDigits[index]) {
            setTimeout(() => {
                this.inputs.get(index - 1)?.nativeElement.focus();
            }, 0);
        }
    }

    handlePaste(event: ClipboardEvent) {
        event.preventDefault();
        const pastedText = event.clipboardData?.getData('text');
        const trimmedText = pastedText?.replace(/\D/g, '').slice(0, CODE_LENGTH);

        if (!trimmedText) return;

        const inputArray = this.inputs.toArray();

        for (let i = 0; i < trimmedText.length && i < CODE_LENGTH; i++) {
            this.codeDigits[i] = trimmedText[i];
            const input = inputArray[i];
            if (input) {
                input.nativeElement.value = trimmedText[i];
            }
        }

        this.updateGameCode();

        const lastIndex = Math.min(trimmedText.length, CODE_LENGTH) - 1;
        const focusIndex = lastIndex < CODE_LENGTH - 1 ? lastIndex + 1 : lastIndex;
        setTimeout(() => {
            inputArray[focusIndex]?.nativeElement.focus();
        }, 0);
    }

    updateGameCode() {
        const code = this.codeDigits.join('');
        this.isCodeValid = code.length === CODE_LENGTH && /^\d{4}$/.test(code);
    }

    async joinGame() {
        const currentPlayerInfo = {
            _id: this.lobbyService.getSocketId(),
        } as PlayerInfo;

        if (this.isCodeValid) {
            this.lobbyService.leaveLobby();

            const response = await this.lobbyService.joinLobby(this.codeDigits.join(''));
            if (response.hasJoinedLobby) {
                if (await this.lobbyService.isLobbyLocked(currentPlayerInfo)) {
                    this.lobbyService.leaveLobby();

                    this.snackbarService.showSnackBar('La partie est verrouillée');
                    return;
                }
                this.router.navigate(['/champ-select']);
            } else {
                this.snackbarService.showSnackBar('Le code entré est invalide');
            }
        }
    }
}
