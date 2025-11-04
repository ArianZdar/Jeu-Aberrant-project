import { ID_LENGTH } from '@app/constants/server-constants';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { GameInfo } from '@common/game/game-info';
import { Types } from 'mongoose';

export const getFakeGameInfo = (): GameInfo & { _id: string } => ({
    _id: new Types.ObjectId().toString(),
    name: getRandomString(),
    description: getRandomString(),
    gameMode: GameModes.Classic,
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
    items: [
        { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
        { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
    ],
    isHidden: false,
    thumbnail: ' ',
});

const getRandomString = (): string => (Math.random() + 1).toString(ID_LENGTH).substring(2);
