import { Game } from '@app/model/class/game/game';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { GameGrid } from '@common/game/game-info';
import { PlayerInfo } from '@common/player/player-info';

const COL_FULL_OF_WALLS = 4;
const ROW_HOLE_IN_WALLS = 5;
const SPAWN_COORDINATE = 9;
export const SIZE_MAP = 10;

export const smallGameGridGrass: GameGrid = {
    tiles: Array(SIZE_MAP)
        .fill(null)
        .map((_, rowIndex) =>
            Array(SIZE_MAP)
                .fill(null)
                .map((__, colIndex) => ({
                    tileType: 'terrain',
                    material: 'grass',
                    isSpawnPoint: (rowIndex === 0 && colIndex === 0) || (rowIndex === 0 && colIndex === 2),
                    ...(rowIndex === 0 && colIndex === 1 ? { tileType: 'wall', material: 'stone' } : {}),
                })),
        ),
    size: 'small',
};

const smallGameGridIce: GameGrid = {
    tiles: Array(SIZE_MAP)
        .fill(null)
        .map((_, rowIndex) =>
            Array(SIZE_MAP)
                .fill(null)
                .map((__, colIndex) => ({
                    tileType: 'terrain',
                    material: 'ice',
                    isSpawnPoint: (rowIndex === 0 && colIndex === 0) || (rowIndex === SPAWN_COORDINATE && colIndex === SPAWN_COORDINATE),
                    ...(colIndex === COL_FULL_OF_WALLS && rowIndex !== ROW_HOLE_IN_WALLS ? { tileType: 'wall', material: 'stone' } : {}),
                })),
        ),
    size: 'small',
};

export const mockPlayers: PlayerInfo[] = [
    {
        _id: '0001',
        name: 'Player One',
        healthPower: 6,
        attackPower: 4,
        defensePower: 6,
        speed: 4,
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: true,
        championIndex: 0,
        isReady: true,
        isAlive: true,
        isDisconnected: false,
    },
    {
        _id: '0002',
        name: 'Player Two',
        healthPower: 4,
        attackPower: 6,
        defensePower: 4,
        speed: 6,
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: false,
        championIndex: 1,
        isReady: true,
        isAlive: true,
        isDisconnected: false,
    },
];

export const mockGameOnlyGrass: Game = new Game({
    id: '0000',
    mapId: 'aaaaaaaaaaaaaaaaaaaaaaaa',
    gameMode: GameModes.Classic,
    grid: smallGameGridGrass,
    players: mockPlayers,
    gameItems: [],
});

export const mockGameIce: Game = new Game({
    id: '6666',
    mapId: 'bbbbbbbbbbbbbbbbbbbbbbbb',
    gameMode: GameModes.Classic,
    grid: smallGameGridIce,
    players: mockPlayers,
    gameItems: [],
});

export const mockGameNoItems: Game = new Game({
    id: '4321',
    mapId: 'noItems',
    gameMode: GameModes.Classic,
    grid: smallGameGridGrass,
    players: mockPlayers,
    gameItems: [],
});

export const mockItemArray = [
    { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
    { position: { x: 1, y: 0 }, item: GameObjects.RandomItem },
];

export const mockGameWithItems: Game = new Game({
    id: '4321',
    mapId: 'noItems',
    gameMode: GameModes.Classic,
    grid: smallGameGridGrass,
    players: mockPlayers,
    gameItems: mockItemArray,
});
