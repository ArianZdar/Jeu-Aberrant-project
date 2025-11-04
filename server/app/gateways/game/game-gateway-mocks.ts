import { Teams } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { Socket } from 'socket.io';

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

export const mockSocket = {
    id: 'player1',
    handshake: {
        auth: {
            lobbySocketId: 'lobbySocketId1',
        },
    },
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
    rooms: new Set(['room1']),
} as unknown as Socket;

export const mockPlayer1: Player = {
    _id: 'player1',
    name: 'Player One',
    championName: 'test-champion',

    healthPower: 100,
    maxHealthPower: 100,
    attackPower: 10,
    defensePower: 5,
    speed: 5,
    maxSpeed: 5,
    actionPoints: 3,
    maxActionPoints: 3,

    position: { x: 0, y: 0 },
    spawnPointPosition: { x: 0, y: 0 },

    isWinner: false,
    isBot: false,
    isAggressive: false,
    isLeader: true,
    isTurn: true,
    isConnected: true,
    nbFightsWon: 0,
    isCombatTurn: false,
    escapesAttempts: 0,
    team: Teams.None,
    hasFlag: false,
    items: [],
    buffs: { attackBuff: 0, defenseBuff: 0 },
    isInCombat: false,
    activeBuffs: [],
};

export const mockPlayer2: Player = {
    _id: 'player2',
    name: 'Player Two',
    championName: 'test-champion',

    healthPower: 100,
    maxHealthPower: 100,
    attackPower: 10,
    defensePower: 5,
    speed: 5,
    maxSpeed: 5,
    actionPoints: 3,
    maxActionPoints: 3,

    position: { x: 0, y: 0 },
    spawnPointPosition: { x: 0, y: 0 },

    isWinner: false,
    isBot: false,
    isAggressive: false,
    isLeader: true,
    isTurn: false,
    isConnected: true,
    nbFightsWon: 0,
    isCombatTurn: false,
    escapesAttempts: 0,
    team: Teams.None,
    items: [],
    hasFlag: false,
    buffs: { attackBuff: 0, defenseBuff: 0 },
    isInCombat: false,
    activeBuffs: [],
};

export const mockAttackState = {
    combatFinished: true,
    attacker: mockPlayer1,
    target: mockPlayer2,
    attackValue: 10,
    defenseValue: 5,
};
