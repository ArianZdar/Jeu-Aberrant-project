import { Game } from '@app/model/class/game/game';
import { GameItem } from '@app/model/schema/game-item.schema';
import { GameModes, GameObjects } from '@common/game/game-enums';

export const mockGameItem: GameItem = {
    position: { x: 0, y: 0 },
    item: GameObjects.None,
};

export const mockTile = { tileType: 'grass', material: 'grass.png', isSpawnPoint: true };

export const mockGameGrid = {
    tiles: [
        [mockTile, { ...mockTile, isSpawnPoint: false }],
        [{ ...mockTile, isSpawnPoint: true }, mockTile],
    ],
    size: '10x10',
};

export const mockPlayerInfo1 = {
    _id: 'player1',
    name: 'Player One',
    championIndex: 0,
    healthPower: 4,
    attackPower: 4,
    defensePower: 6,
    speed: 6,
    isReady: true,
    isAlive: true,
    isWinner: false,
    isDisconnected: false,
    isBot: false,
    isAggressive: false,
    isLeader: true,
};

export const mockPlayerInfo2 = {
    _id: 'player2',
    name: 'Player Two',
    championIndex: 1,
    healthPower: 6,
    attackPower: 4,
    defensePower: 6,
    speed: 4,
    isReady: true,
    isAlive: true,
    isWinner: false,
    isDisconnected: false,
    isBot: false,
    isAggressive: false,
    isLeader: false,
};

export const mockGameConfig = {
    id: 'test-game-id',
    mapId: 'test-map',
    players: [mockPlayerInfo1, mockPlayerInfo2],
};

export const mockGame = new Game({
    id: 'test-game-id',
    mapId: 'test-map',
    gameMode: GameModes.Classic,
    grid: mockGameGrid,
    players: mockGameConfig.players,
    gameItems: [],
});
