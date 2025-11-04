import { Component, OnInit } from '@angular/core';
import { InventorySlotComponent } from '@app/components/game-page-components/inventory-slot/inventory-slot.component';
import { CommonModule } from '@angular/common';
import { PlayerService } from '@app/services/player/player.service';
import { GameItem } from '@common/grid/grid-state';
@Component({
    selector: 'app-game-actions',
    imports: [InventorySlotComponent, CommonModule],
    templateUrl: './game-actions.component.html',
    styleUrl: './game-actions.component.scss',
})
export class GameActionsComponent implements OnInit {
    mainPlayerItems: GameItem[] = [];

    constructor(private playerService: PlayerService) {}

    ngOnInit(): void {
        this.playerService.getMainPlayerStats().subscribe((player) => {
            if (player) {
                this.mainPlayerItems = player.items;
            }
        });
    }
}
