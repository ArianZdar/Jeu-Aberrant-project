// Les Behavior private/protected doivent être déclarés en premier
/* eslint-disable @typescript-eslint/member-ordering */
import { Injectable } from '@angular/core';
import { GridStateConfig } from '@app/interfaces/client-interfaces';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { Coordinate, Tile } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { BehaviorSubject, Subject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class GridStateService {
    items: GameItem[] = [];
    private spawnPointsSubject = new BehaviorSubject<number | null>(null);
    spawnPoints$ = this.spawnPointsSubject.asObservable();
    private randomItemsSubject = new BehaviorSubject<number | null>(null);
    randomItems$ = this.randomItemsSubject.asObservable();
    private resetSubject = new Subject<void>();
    reset$ = this.resetSubject.asObservable();

    private config: GridStateConfig = {
        title: '',
        description: '',
        gridData: [],
        originalGridData: [],
        originalItems: [],
        size: '',
        gameMode: GameModes.Classic,
    };

    getGridData(): Tile[][] {
        return this.config.gridData;
    }

    setGridData(gridData: Tile[][]): void {
        this.config.gridData = gridData;
    }

    setOriginalGridData(gridData: Tile[][], originalItems?: GameItem[]): void {
        this.config.originalGridData = gridData;
        if (originalItems) {
            this.config.originalItems = originalItems;
        }
    }

    getOriginalGridData(): Tile[][] {
        return this.config.originalGridData;
    }

    getOriginalItems(): GameItem[] {
        return this.config.originalItems;
    }

    setItems(items: GameItem[]): void {
        this.items = items;
    }

    getOriginalNumberOfGameItems(): number {
        return this.config.originalItems.filter((item) => item.item !== GameObjects.Flag).length;
    }

    addGameItem(item: GameItem): void {
        this.items.push(item);
    }

    removeGameItem(item: GameItem): void {
        this.items = this.items.filter((i) => !(i.position.x === item.position.x && i.position.y === item.position.y));
    }

    setRandomItems(value: number) {
        this.randomItemsSubject.next(value);
    }

    setSpawnpointsToPlace(value: number) {
        this.spawnPointsSubject.next(value);
    }

    placeItem(item: GameObjects, position: Coordinate) {
        if (item === GameObjects.Spawnpoint) {
            this.placeSpawnpoint();
            return;
        } else if (item === GameObjects.Flag) {
            this.addGameItem({ position, item });
            return;
        }
        if (this.canPlaceRandomItem()) {
            this.placeRandomItem();
        } else {
            return;
        }
        this.addGameItem({ position, item });
    }

    deleteItem(item: GameObjects, position?: Coordinate) {
        if (item === GameObjects.Spawnpoint) {
            this.deleteSpawnpoint();
            return;
        } else if (item !== GameObjects.Flag) {
            this.deleteRandomItem();
        }
        if (position) {
            this.removeGameItem({ position, item });
        }
    }

    canPlaceSpawnpoint(): boolean {
        return this.spawnPointsSubject.value !== 0;
    }

    canPlaceRandomItem(): boolean {
        return this.randomItemsSubject.value !== 0;
    }

    triggerReset() {
        this.resetSubject.next();
    }

    setSize(size: string) {
        this.config.size = size;
    }

    getSize(): string {
        return this.config.size;
    }

    setGameMode(gameMode: GameModes) {
        this.config.gameMode = gameMode;
    }

    getGameMode(): string {
        return this.config.gameMode;
    }

    setTitle(title: string) {
        this.config.title = title;
    }

    getTitle(): string {
        return this.config.title;
    }

    setDescription(description: string) {
        this.config.description = description;
    }

    getDescription(): string {
        return this.config.description;
    }

    canPlaceItem(itemType: GameObjects): boolean {
        if (itemType === GameObjects.Spawnpoint) {
            return this.canPlaceSpawnpoint();
        } else if (itemType === GameObjects.RandomItem) {
            return this.canPlaceRandomItem();
        } else {
            const itemExists = this.items.some((item) => item.item === itemType);
            if (itemExists) {
                return false;
            } else if (itemType !== GameObjects.Flag) {
                return this.canPlaceRandomItem();
            } else {
                return true;
            }
        }
    }

    getItemAtPosition(position: Coordinate): GameObjects {
        const item = this.items.find((i) => i.position.x === position.x && i.position.y === position.y);

        return item ? item.item : GameObjects.None;
    }

    moveItem(from: Coordinate, to: Coordinate) {
        const item = this.items.find((i) => i.position.x === from.x && i.position.y === from.y);
        if (item) {
            item.position = to;
        }
    }

    reset(): void {
        this.items = [];
        this.spawnPointsSubject.next(null);
        this.randomItemsSubject.next(null);
        this.config = {
            title: '',
            description: '',
            gridData: [],
            originalGridData: [],
            originalItems: [],
            size: '',
            gameMode: GameModes.Classic,
        };
        this.resetSubject.next();
    }

    private deleteSpawnpoint() {
        if (this.spawnPointsSubject.value !== null) {
            this.spawnPointsSubject.next(this.spawnPointsSubject.value + 1);
        }
    }

    private deleteRandomItem() {
        if (this.randomItemsSubject.value !== null) {
            this.randomItemsSubject.next(this.randomItemsSubject.value + 1);
        }
    }

    private placeSpawnpoint() {
        if (this.spawnPointsSubject.value) {
            this.spawnPointsSubject.next(this.spawnPointsSubject.value - 1);
        }
    }

    private placeRandomItem() {
        if (this.randomItemsSubject.value) {
            this.randomItemsSubject.next(this.randomItemsSubject.value - 1);
        }
    }
}
