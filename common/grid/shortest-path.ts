import { Coordinate } from '../game/game-info';
import { GameItem } from './grid-state';

export interface ShortestPath {
    path: Coordinate[];
    firstItemOnPath: GameItem | undefined;
}

export interface WinningPathResult {
    winning: boolean;
    winningPath?: Coordinate[];
}
