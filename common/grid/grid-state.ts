import { GameObjects } from '../game/game-enums';
import { Coordinate } from '../game/game-info';

export interface TileState {
    isDoor: boolean;
    isTraversable: boolean;
    tileCost: number;
    spawnpoint: string;
}

export interface GameItem {
    position: Coordinate;
    item: GameObjects;
}

export interface GridState {
    grid: TileState[][];
}
