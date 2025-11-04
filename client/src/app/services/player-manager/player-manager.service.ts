import { Injectable } from '@angular/core';
import { ChampSelectService } from '@app/services/sockets/champ-select/champ-select.service';
import { PlayerInfo } from '@common/player/player-info';
import { MatDialog } from '@angular/material/dialog';
import { LockedLobbyPopupComponent } from '@app/components/champion-selection-page-components/locked-lobby-popup/locked-lobby-popup.component';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { DICE_6, DICE_4, MIN_POWER, MAX_POWER } from '@app/constants/client-constants';
import { ChatService } from '@app/services/chat/chat.service';

interface PlayerAttributes {
    healthPower: number;
    speedPower: number;
    attackDice: number;
    defenseDice: number;
}

@Injectable({
    providedIn: 'root',
})
export class PlayerManagerService {
    constructor(
        private champSelectService: ChampSelectService,
        private dialog: MatDialog,
        private snackBarService: SnackBarService,
        private chatService: ChatService,
    ) {}

    createPlayerInfo(playerId: string, playerName: string, championIndex: number, attributes: PlayerAttributes): PlayerInfo {
        const { healthPower, speedPower, attackDice, defenseDice } = attributes;

        const finalHealthPower = healthPower === MAX_POWER ? MAX_POWER : MIN_POWER;
        const finalSpeedPower = healthPower === MIN_POWER ? MAX_POWER : speedPower;
        const finalAttackPower = attackDice === DICE_4 ? MIN_POWER : MAX_POWER;
        const finalDefensePower = attackDice !== DICE_4 ? MIN_POWER : defenseDice === DICE_6 ? MAX_POWER : MIN_POWER;

        return {
            _id: playerId,
            name: playerName,
            championIndex,
            healthPower: finalHealthPower,
            attackPower: finalAttackPower,
            defensePower: finalDefensePower,
            speed: finalSpeedPower,
            isReady: false,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
            isLeader: false,
        };
    }

    async submitPlayer(playerInfo: PlayerInfo): Promise<boolean> {
        if (await this.champSelectService.isRoomFull(playerInfo)) {
            this.snackBarService.showSnackBar('La partie est pleine.');
            return false;
        }

        if (await this.champSelectService.isRoomLocked(playerInfo)) {
            this.showLockedRoomDialog(playerInfo);
            return false;
        }

        this.champSelectService.submitChampSelect(playerInfo);
        this.chatService.initializeCurrentPlayerName(playerInfo.name);
        return true;
    }

    private showLockedRoomDialog(playerInfo: PlayerInfo): void {
        const dialogRef = this.dialog.open(LockedLobbyPopupComponent, {
            width: '30vh',
            disableClose: true,
        });

        dialogRef.afterClosed().subscribe((result) => {
            if (result === 'retry') {
                this.champSelectService.submitChampSelect(playerInfo);
            }
        });
    }
}
