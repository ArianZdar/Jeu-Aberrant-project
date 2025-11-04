import { GameModes } from '@common/game/game-enums';
import { GameInfo } from '@common/game/game-info';

const BASE_36 = 36;

export const getFakeGameInfo = (): GameInfo & { _id: string } => ({
    _id: getRandomString(),
    name: getRandomString(),
    description: getRandomString(),
    gameMode: GameModes.CTF,
    lastChange: new Date(),
    gameGrid: {
        tiles: [
            [
                { tileType: 'terrain', material: 'grass', isSpawnPoint: true },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
            ],
            [
                { tileType: 'wall', material: 'stone', isSpawnPoint: false },
                { tileType: 'door', material: 'wood', isSpawnPoint: false },
                { tileType: 'wall', material: 'stone', isSpawnPoint: false },
            ],
            [
                { tileType: 'terrain', material: 'grass', isSpawnPoint: true },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
            ],
        ],
        size: 'small',
    },
    items: [],
    isHidden: false,
    thumbnail: '',
});

const getRandomString = (): string => (Math.random() + 1).toString(BASE_36).substring(2);
