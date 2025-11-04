import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameItem } from '@common/grid/grid-state';
import { GameObjects } from '@common/game/game-enums';
import { ITEM_DESCRIPTION_MAP, ITEM_DISPLAY_NAMES } from '@app/constants/client-constants';

@Component({
    selector: 'app-inventory-slot',
    imports: [CommonModule],
    templateUrl: './inventory-slot.component.html',
    styleUrl: './inventory-slot.component.scss',
})
export class InventorySlotComponent {
    @Input() item: GameItem | undefined;

    getItemDisplayName(itemType: GameObjects): string {
        return ITEM_DISPLAY_NAMES[itemType];
    }

    getItemDescription(itemType: GameObjects): string {
        return ITEM_DESCRIPTION_MAP[itemType];
    }
}
