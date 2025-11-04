import { GameModes } from './game-enums';
import { GameItem } from '../grid/grid-state';

export interface Tile {
    tileType: string;
    material: string;
    isSpawnPoint: boolean;
}

export enum TileType {
    Wall = 'wall',
    Door = 'door',
    Terrain = 'terrain',
}

export enum TileMaterial {
    Grass = 'grass',
    GrassLighter = 'grasslighter',
    Ice = 'ice',
    Water = 'water',
    Door = 'door',
    OpenDoor = 'openDoor',
    Wall = 'wall',
}

export const TILE_TYPES: { [key: string]: string } = {
    grass: 'terrain',
    grasslighter: 'terrain',
    water: 'terrain',
    ice: 'terrain',
    wall: 'wall',
    door: 'door',
    openDoor: 'door',
    default: 'terrain',
};

export const TILE_IMAGE_URLS: { [key: string]: string } = {
    grass: './assets/grass.png',
    grasslighter: './assets/grasslighter.png',
    water: './assets/water.png',
    ice: './assets/ice.png',
    wall: './assets/wall.png',
    stone: './assets/wall.png',
    door: './assets/door.png',
    openDoor: './assets/open_door.png',
    default: './assets/grass.png',
};

export interface GameGrid {
    tiles: Tile[][];
    size: string;
}

export interface GameInfo {
    _id: string;
    name: string;
    gameMode: GameModes;
    description: string;
    gameGrid: GameGrid;
    items: GameItem[];
    lastChange: Date;
    isHidden: boolean;
    thumbnail: string;
}

export interface GameInfoNoId {
    name: string;
    gameMode: GameModes;
    description: string;
    gameGrid: GameGrid;
    items: GameItem[];
    lastChange: Date;
    isHidden: boolean;
    thumbnail: string;
}

export interface Coordinate {
    x: number;
    y: number;
}

export const MIN_PLAYERS = 2;
export const DELAY_BEFORE_RETURNING_TO_HOME_PAGE = 5000;
export const NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY = 3;
export const STANDARD_COMBAT_TURN_DURATION = 5;
export const REDUCED_COMBAT_TURN_DURATION = 3;
export const MAX_ESCAPES_ATTEMPTS = 2;
