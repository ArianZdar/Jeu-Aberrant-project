import { Coordinate } from '@common/game/game-info';

export interface AccessibleTileQueueItem {
    x: number;
    y: number;
    cost: number;
}

export interface PathQueueItem {
    node: Coordinate;
    cost: number;
    stepCount: number;
}
