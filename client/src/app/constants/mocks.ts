/* eslint-disable max-lines */

import { CombatData } from '@app/interfaces/client-interfaces';
import { GameModes, GameObjects, Teams } from '@common/game/game-enums';
import { Coordinate, GameInfo, Tile } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { Lobby } from '@common/lobby/lobby-info';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';

const BASE_36 = 36;

export const getFakeGameInfo = (): GameInfo & { _id: string } => ({
    _id: getRandomString(),
    name: getRandomString(),
    description: getRandomString(),
    gameMode: GameModes.CTF,
    lastChange: new Date(),
    gameGrid: {
        tiles: mockTiles,
        size: 'small',
    },
    items: [],
    isHidden: false,
    thumbnail: '',
});

export const mockTiles: Tile[][] = [
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
];

export const mockGridTiles: Tile[][] = [
    [
        { tileType: 'terrain', material: './assets/grass.png', isSpawnPoint: true },
        { tileType: 'terrain', material: './assets/water.png', isSpawnPoint: false },
        { tileType: 'terrain', material: './assets/ice.png', isSpawnPoint: false },
    ],
    [
        { tileType: 'wall', material: './assets/wall.png', isSpawnPoint: false },
        { tileType: 'door', material: './assets/door.png', isSpawnPoint: false },
        { tileType: 'door', material: './assets/open_door.png', isSpawnPoint: false },
    ],
    [
        { tileType: 'terrain', material: './assets/grass.png', isSpawnPoint: true },
        { tileType: 'terrain', material: './assets/water.png', isSpawnPoint: false },
        { tileType: 'terrain', material: './assets/ice.png', isSpawnPoint: false },
    ],
];

export const createMockPlayer = (isLeader: boolean): PlayerInfo => ({
    _id: getRandomString(),
    name: getRandomString(),
    isLeader,
    championIndex: 0,
    healthPower: 6,
    attackPower: 4,
    defensePower: 4,
    speed: 4,
    isReady: true,
    isAlive: true,
    isWinner: false,
    isDisconnected: false,
    isBot: false,
    isAggressive: false,
});

const getRandomString = (): string => (Math.random() + 1).toString(BASE_36).substring(2);

export const mockLobby: Lobby = {
    code: getRandomString(),
    mapId: getRandomString(),
    players: [createMockPlayer(false), createMockPlayer(false)],
    maxPlayers: 4,
    locked: false,
};

export const mockFullLobbyWithCorrectLeader: Lobby = {
    ...mockLobby,
    players: [
        {
            _id: 'player1',
            name: 'Player 1',
            isLeader: true,
            championIndex: 1,
            healthPower: 100,
            attackPower: 10,
            defensePower: 10,
            speed: 10,
            isReady: true,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
        },
        createMockPlayer(false),
        createMockPlayer(false),
        createMockPlayer(false),
    ],
    maxPlayers: 4,
};

export const mockGameConfig = {
    id: '1234',
    mapId: '9999999',
    players: [createMockPlayer(false), createMockPlayer(true)],
};

export const mockPlayers: Player[] = [
    {
        _id: 'player1',
        name: 'Player 1',
        championName: 'beast',
        healthPower: 6,
        maxHealthPower: 6,
        attackPower: 4,
        defensePower: 6,
        speed: 6,
        actionPoints: 1,
        maxActionPoints: 1,
        position: { x: 0, y: 0 },
        spawnPointPosition: { x: 0, y: 0 },
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: true,
        isTurn: false,
        nbFightsWon: 0,
        isConnected: true,
        isCombatTurn: false,
        escapesAttempts: 0,
        maxSpeed: 6,
        team: Teams.None,
        hasFlag: false,
        items: [],
        buffs: { attackBuff: 0, defenseBuff: 0 },
        activeBuffs: [],
        isInCombat: false,
    },
    {
        _id: 'player2',
        name: 'Player 2',
        championName: 'Champion2',
        healthPower: 4,
        maxHealthPower: 4,
        attackPower: 6,
        defensePower: 4,
        speed: 6,
        actionPoints: 1,
        maxActionPoints: 1,
        position: { x: 1, y: 1 },
        spawnPointPosition: { x: 1, y: 1 },
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: false,
        isTurn: false,
        nbFightsWon: 0,
        isConnected: true,
        isCombatTurn: false,
        escapesAttempts: 0,
        maxSpeed: 6,
        team: Teams.None,
        hasFlag: false,
        items: [],
        buffs: { attackBuff: 0, defenseBuff: 0 },
        activeBuffs: [],
        isInCombat: false,
    },
];
export const mockBotPlayer: Player[] = [
    {
        _id: 'player1',
        name: 'Player 1',
        championName: 'beast',
        healthPower: 6,
        maxHealthPower: 6,
        attackPower: 4,
        defensePower: 6,
        speed: 6,
        actionPoints: 1,
        maxActionPoints: 1,
        position: { x: 0, y: 0 },
        spawnPointPosition: { x: 0, y: 0 },
        isWinner: false,
        isBot: true,
        isAggressive: false,
        isLeader: true,
        isTurn: false,
        nbFightsWon: 0,
        isConnected: true,
        isCombatTurn: false,
        escapesAttempts: 0,
        maxSpeed: 6,
        team: Teams.None,
        hasFlag: false,
        items: [],
        buffs: { attackBuff: 0, defenseBuff: 0 },
        activeBuffs: [],
        isInCombat: false,
    },
    {
        _id: 'player2',
        name: 'Player 2',
        championName: 'Champion2',
        healthPower: 4,
        maxHealthPower: 4,
        attackPower: 6,
        defensePower: 4,
        speed: 6,
        actionPoints: 1,
        maxActionPoints: 1,
        position: { x: 1, y: 1 },
        spawnPointPosition: { x: 1, y: 1 },
        isWinner: false,
        isBot: false,
        isAggressive: false,
        isLeader: false,
        isTurn: false,
        nbFightsWon: 0,
        isConnected: true,
        isCombatTurn: false,
        escapesAttempts: 0,
        maxSpeed: 6,
        team: Teams.None,
        hasFlag: false,
        items: [],
        buffs: { attackBuff: 0, defenseBuff: 0 },
        activeBuffs: [],
        isInCombat: false,
    },
];

export const botPlayer: Player = {
    _id: 'botPlayer',
    name: 'Bot Player',
    isBot: true,
    championName: 'Bot Champion',
    healthPower: 100,
    maxHealthPower: 100,
    attackPower: 10,
    defensePower: 5,
    speed: 5,
    actionPoints: 2,
    maxActionPoints: 2,
    position: { x: 0, y: 0 },
    spawnPointPosition: { x: 0, y: 0 },
    isLeader: false,
    isTurn: false,
    nbFightsWon: 0,
    isConnected: true,
    isCombatTurn: false,
    escapesAttempts: 0,
    maxSpeed: 6,
    team: Teams.None,
    hasFlag: false,
    items: [],
    buffs: { attackBuff: 0, defenseBuff: 0 },
    activeBuffs: [],
    isInCombat: false,
    isWinner: false,
    isAggressive: false,
};

export const mockFixedPlayer: Player = {
    _id: 'testplayer',
    name: 'Player',
    championName: 'Champion',
    healthPower: 4,
    maxHealthPower: 4,
    attackPower: 6,
    defensePower: 4,
    speed: 6,
    actionPoints: 1,
    maxActionPoints: 1,
    position: { x: 1, y: 1 },
    spawnPointPosition: { x: 1, y: 1 },
    isWinner: false,
    isBot: false,
    isAggressive: false,
    isLeader: false,
    isTurn: false,
    nbFightsWon: 0,
    isConnected: true,
    isCombatTurn: false,
    escapesAttempts: 0,
    maxSpeed: 6,
    team: Teams.None,
    hasFlag: false,
    items: [],
    buffs: { attackBuff: 0, defenseBuff: 0 },
    activeBuffs: [],
    isInCombat: false,
};

export const mockCoordinateList: Coordinate[] = [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: 2 },
];

export const mockCombatData: { [key: string]: CombatData } = {
    mainPlayerAttacking: {
        attackerId: mockPlayers[0]._id,
        targetId: mockPlayers[1]._id,
        damage: 2,
    },

    opponentAttacking: {
        attackerId: mockPlayers[1]._id,
        targetId: mockPlayers[0]._id,
        damage: 3,
    },

    nonExistentAttacker: {
        attackerId: 'non-existent-player',
        targetId: mockPlayers[0]._id,
        damage: 2,
    },

    nonExistentTarget: {
        attackerId: mockPlayers[0]._id,
        targetId: 'non-existent-player',
        damage: 2,
    },
};

export const mockGameItems: GameItem[] = [
    {
        position: { x: 3, y: 4 },
        item: GameObjects.SwiftnessBoots,
    },
    {
        position: { x: 5, y: 7 },
        item: GameObjects.Armor,
    },
    {
        position: { x: 1, y: 2 },
        item: GameObjects.Shield,
    },
    {
        position: { x: 8, y: 9 },
        item: GameObjects.GladiatorHelm,
    },
    {
        position: { x: 4, y: 6 },
        item: GameObjects.Bomb,
    },
    {
        position: { x: 2, y: 8 },
        item: GameObjects.Pickaxe,
    },
];

export const mockGameItem: GameItem = {
    position: { x: 3, y: 4 },
    item: GameObjects.SwiftnessBoots,
};

export const repeatNumber = 1000;
