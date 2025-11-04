import { Injectable } from '@angular/core';
import { ITEM_TIMEOUT } from '@app/constants/client-constants';
import { GameObjects } from '@common/game/game-enums';

@Injectable({
    providedIn: 'root',
})
export class ToolStateService {
    private activeTool: string | null = null;
    private itemBeingPlaced: GameObjects = GameObjects.None;
    private currentlyDragging: boolean = false;
    private itemTimer: ReturnType<typeof setTimeout> | null = null;

    setActiveTool(tool: string): void {
        this.activeTool = tool;
    }

    getActiveTool(): string | null {
        return this.activeTool;
    }

    placeItem(itemType: GameObjects): void {
        this.itemBeingPlaced = itemType;

        if (this.itemTimer) {
            clearTimeout(this.itemTimer);
            this.itemTimer = null;
        }

        if (itemType) {
            this.itemTimer = setTimeout(() => {
                this.itemBeingPlaced = GameObjects.None;
            }, ITEM_TIMEOUT);
        }
    }

    placedItem(): void {
        this.itemBeingPlaced = GameObjects.None;
    }

    getItemBeingPlaced(): GameObjects {
        return this.itemBeingPlaced;
    }

    setCurrentlyDragging(value: boolean): void {
        this.currentlyDragging = value;
    }

    getCurrentlyDragging(): boolean {
        return this.currentlyDragging;
    }
}
