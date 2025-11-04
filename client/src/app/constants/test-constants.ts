import { Coordinate } from '@common/game/game-info';

export const TEST_REACHABLE_TILES: Coordinate[] = [
    { x: 1, y: 2 },
    { x: 3, y: 4 },
];
export const TEST_UNREACHABLE_TILE: Coordinate = { x: 5, y: 6 };
export const TEST_TARGET_TILE: Coordinate = { x: 5, y: 5 };
export const TEST_PATH: Coordinate[] = [
    { x: 1, y: 1 },
    { x: 2, y: 2 },
    { x: 3, y: 3 },
];
export const TEST_COORDINATE: Coordinate = { x: 1, y: 1 };
export const TEST_TILE_SIZE = 10;
