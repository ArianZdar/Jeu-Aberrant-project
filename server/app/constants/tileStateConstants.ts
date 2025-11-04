import { TileState } from '@common/grid/grid-state';

export const TILE_STATE_MAP = new Map<string, Omit<TileState, 'spawnpoint'>>([
    ['grass', { isDoor: false, isTraversable: true, tileCost: 1 }],
    ['grasslighter', { isDoor: false, isTraversable: true, tileCost: 1 }],
    ['ice', { isDoor: false, isTraversable: true, tileCost: 0 }],
    ['water', { isDoor: false, isTraversable: true, tileCost: 2 }],
    ['wall', { isDoor: false, isTraversable: false, tileCost: Infinity }],
    ['open_door', { isDoor: true, isTraversable: true, tileCost: 1 }],
    ['door', { isDoor: true, isTraversable: false, tileCost: Infinity }],
]);
