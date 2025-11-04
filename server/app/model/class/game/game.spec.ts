/* eslint-disable max-lines */

import { CHAMPIONS, COIN_FLIP_PROBABILITY } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { mockPlayers as mockPlayerInfos, SIZE_MAP, smallGameGridGrass } from '@app/services/game-logic/mock-game';
import { GameModes, GameObjects, Teams } from '@common/game/game-enums';
import { Coordinate, GameGrid, Tile } from '@common/game/game-info';
import { GridState } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';

const MAX_STATE_POWER = 6;
const CHANGE_COIN_FLIP_PROBABILITY = 0.1;
interface GameWithPrivateProps {
    _id: string;
    _mapId: string;
    _players: Player[];
    _spawnpoints: Coordinate[];
    _gameMode: GameModes;
    _gridState: GridState;
    _currentTurnHolder: number;
    _isDebugModeActive: boolean;
    initializeGridState(gameGrid: GameGrid): void;
    initializeTileState(x: number, y: number, tile: Tile): void;
    initializePlayers(players: PlayerInfo[]): void;
    initializePlayer(playerInfo: PlayerInfo): void;
    shuffleArray<T>(array: T[]): T[];
    assignSpawnpoints(): void;
}

describe('Game', () => {
    let game: Game;
    let gameWithPrivateProps: GameWithPrivateProps;
    let players: PlayerInfo[];
    let gameGrid: GameGrid;

    beforeEach(() => {
        players = mockPlayerInfos;
        gameGrid = smallGameGridGrass;
        game = new Game({
            id: '1234',
            mapId: 'map123',
            gameMode: GameModes.Classic,
            grid: gameGrid,
            players,
            gameItems: [
                { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
                { position: { x: 1, y: 1 }, item: GameObjects.Flag },
            ],
        });
        gameWithPrivateProps = game as unknown as GameWithPrivateProps;
    });

    describe('Constructor and initialization', () => {
        it('should initialize with correct properties', () => {
            expect(game.id).toBe('1234');
            expect(game.mapId).toBe('map123');
            expect(game.gameMode).toBe(GameModes.Classic);
            expect(game.players.length).toBe(2);
            expect(game.isDebugModeActive).toBe(false);
            expect(game.items).toBeDefined();
        });

        it('should set teams if the game mode is CTF', () => {
            game = new Game({
                id: '1234',
                mapId: 'map123',
                gameMode: GameModes.CTF,
                grid: gameGrid,
                players,
                gameItems: [
                    { position: { x: 0, y: 0 }, item: GameObjects.RandomItem },
                    { position: { x: 1, y: 1 }, item: GameObjects.Flag },
                ],
            });
            expect(game.players[0].team).not.toBe(Teams.None);
        });

        it('should properly initialize grid state', () => {
            const initTileSpy = jest.spyOn(gameWithPrivateProps, 'initializeTileState');

            gameWithPrivateProps.initializeGridState(gameGrid);

            expect(initTileSpy).toHaveBeenCalled();

            const smallGrid: GameGrid = {
                tiles: [
                    [
                        { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                        { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                    ],
                    [
                        { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                        { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                    ],
                ],
                size: 'small',
            };

            gameWithPrivateProps.initializeGridState(smallGrid);
            expect(initTileSpy).toHaveBeenCalledWith(0, 0, smallGrid.tiles[0][0]);
            expect(initTileSpy).toHaveBeenCalledWith(0, 1, smallGrid.tiles[0][1]);
            expect(initTileSpy).toHaveBeenCalledWith(1, 0, smallGrid.tiles[1][0]);
            expect(initTileSpy).toHaveBeenCalledWith(1, 1, smallGrid.tiles[1][1]);
        });

        it('should initialize grid stat with tile material with edge case name', () => {
            const initTileSpy = jest.spyOn(gameWithPrivateProps, 'initializeTileState');

            const smallGrid: GameGrid = {
                tiles: [
                    [
                        { tileType: 'terrain', material: '', isSpawnPoint: false },
                        { tileType: 'terrain', material: '/', isSpawnPoint: false },
                    ],
                    [
                        { tileType: 'terrain', material: 'material/file', isSpawnPoint: false },
                        { tileType: 'terrain', material: 'grass', isSpawnPoint: false },
                    ],
                ],
                size: 'small',
            };

            gameWithPrivateProps.initializeGridState(smallGrid);

            expect(initTileSpy).toHaveBeenCalledWith(0, 0, {
                tileType: 'terrain',
                material: '',
                isSpawnPoint: false,
            });

            expect(initTileSpy).toHaveBeenCalledWith(1, 0, {
                tileType: 'terrain',
                material: '/',
                isSpawnPoint: false,
            });
        });

        it('should initialize players with correct attributes and sort by speed', () => {
            const speedOrderPlayers: PlayerInfo[] = [
                { ...players[0], speed: 4 },
                { ...players[1], speed: MAX_STATE_POWER },
            ];

            const speedOrderGame = new Game({
                id: 'speedTest',
                mapId: 'map123',
                gameMode: GameModes.Classic,
                grid: gameGrid,
                players: speedOrderPlayers,
                gameItems: [] || [],
            });
            expect(speedOrderGame.players[0]._id).toBe(speedOrderPlayers[1]._id);
            expect(speedOrderGame.players[1]._id).toBe(speedOrderPlayers[0]._id);
            const firstPlayer = speedOrderGame.players[0];
            expect(firstPlayer._id).toBe(speedOrderPlayers[1]._id);
            expect(firstPlayer.name).toBe(speedOrderPlayers[1].name);
            expect(firstPlayer.championName).toBe(CHAMPIONS[speedOrderPlayers[1].championIndex].name);
            expect(firstPlayer.healthPower).toBe(speedOrderPlayers[1].healthPower);
            expect(firstPlayer.attackPower).toBe(speedOrderPlayers[1].attackPower);
            expect(firstPlayer.defensePower).toBe(speedOrderPlayers[1].defensePower);
            expect(firstPlayer.speed).toBe(speedOrderPlayers[1].speed);
            expect(firstPlayer.actionPoints).toBe(1);
            expect(firstPlayer.isWinner).toBe(speedOrderPlayers[1].isWinner);
            expect(firstPlayer.isLeader).toBe(speedOrderPlayers[1].isLeader);
            expect(firstPlayer.isTurn).toBe(false);
            expect(firstPlayer.isConnected).toBe(true);
            expect(firstPlayer.nbFightsWon).toBe(0);
            expect(firstPlayer.isCombatTurn).toBe(false);
            expect(firstPlayer.escapesAttempts).toBe(0);
        });

        it('should test initializing a single player directly', () => {
            const testPlayerInfo: PlayerInfo = {
                _id: 'test123',
                name: 'Test Player',
                championIndex: 3,
                healthPower: MAX_STATE_POWER,
                attackPower: MAX_STATE_POWER,
                defensePower: 4,
                speed: 4,
                isReady: true,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: true,
                isAggressive: false,
                isLeader: false,
            };

            const playersLengthBefore = gameWithPrivateProps._players.length;
            gameWithPrivateProps.initializePlayer(testPlayerInfo);

            expect(gameWithPrivateProps._players.length).toBe(playersLengthBefore + 1);
            const addedPlayer = gameWithPrivateProps._players[gameWithPrivateProps._players.length - 1];

            expect(addedPlayer._id).toBe('test123');
            expect(addedPlayer.name).toBe('Test Player');
            expect(addedPlayer.championName).toBe(CHAMPIONS[3].name);
        });

        it('should assign spawnpoints to players', () => {
            for (const player of game.players) {
                expect(player.position).toBeDefined();
                expect(player.spawnPointPosition).toBeDefined();
                expect(player.position).toEqual(player.spawnPointPosition);
            }
        });

        it('should shuffle spawnpoints when assigning', () => {
            const spyOnShuffle = jest.spyOn(gameWithPrivateProps, 'shuffleArray');
            gameWithPrivateProps.assignSpawnpoints();
            expect(spyOnShuffle).toHaveBeenCalled();
        });

        it('should sort players by speed (or randomly if speeds are equal)', () => {
            const equalSpeedPlayers: PlayerInfo[] = [
                { ...players[0], speed: 5 },
                { ...players[1], speed: 5 },
            ];

            const mockRandom = jest.spyOn(Math, 'random');
            mockRandom.mockReturnValue(COIN_FLIP_PROBABILITY + CHANGE_COIN_FLIP_PROBABILITY);

            const gameWithEqualSpeeds = new Game({
                id: 'test',
                mapId: 'map',
                gameMode: GameModes.Classic,
                grid: gameGrid,
                players: equalSpeedPlayers,
                gameItems: [],
            });

            expect(gameWithEqualSpeeds.players[0]._id).toBe(equalSpeedPlayers[0]._id);

            mockRandom.mockReturnValue(COIN_FLIP_PROBABILITY - CHANGE_COIN_FLIP_PROBABILITY);

            const gameWithEqualSpeeds2 = new Game({
                id: 'test',
                mapId: 'map',
                gameMode: GameModes.Classic,
                grid: gameGrid,
                players: equalSpeedPlayers,
                gameItems: [],
            });

            expect(gameWithEqualSpeeds2.players[0]._id).toBe(equalSpeedPlayers[1]._id);

            mockRandom.mockRestore();
        });
    });

    describe('Getters', () => {
        it('should return id', () => {
            expect(game.id).toBe('1234');
        });

        it('should return mapId', () => {
            expect(game.mapId).toBe('map123');
        });

        it('should return gameMode', () => {
            expect(game.gameMode).toBe(GameModes.Classic);
        });

        it('should return gridState', () => {
            expect(game.gridState).toBeDefined();
            expect(game.gridState.grid).toBeInstanceOf(Array);
        });

        it('should return players', () => {
            expect(game.players).toBeInstanceOf(Array);
            expect(game.players.length).toBe(2);
        });

        it('should return currentPlayerId', () => {
            expect(game.currentPlayerId).toBe(game.players[0]._id);
        });

        it('should return isDebugModeActive', () => {
            expect(game.isDebugModeActive).toBe(false);
        });
    });

    describe('Player management', () => {
        it('should remove a player when valid id is provided', () => {
            const playerId = game.players[0]._id;
            const removedPlayer = game.removePlayer(playerId);

            expect(removedPlayer).toBeDefined();
            expect(removedPlayer?._id).toBe(playerId);
            expect(game.players.length).toBe(1);
            expect(game.players.find((p) => p._id === playerId)).toBeUndefined();
        });

        it('should return null when removing a player with invalid id', () => {
            const invalidId = 'invalid-id';
            const result = game.removePlayer(invalidId);

            expect(result).toBeNull();
            expect(game.players.length).toBe(2);
        });

        it('should check if a tile is occupied', () => {
            const playerPosition = game.players[0].position;
            const occupied = game.isTileOccupied(playerPosition);

            expect(occupied).toBe(true);

            const emptyPosition: Coordinate = { x: 5, y: 5 };
            game.players.forEach((p) => {
                p.position = { x: 0, y: 0 };
            });

            const notOccupied = game.isTileOccupied(emptyPosition);
            expect(notOccupied).toBe(false);
        });
    });

    describe('Player movement', () => {
        it('should move a player to valid position and reduce speed', () => {
            const player = game.players[0];
            const originalSpeed = player.speed;
            const startPosition: Coordinate = { x: 2, y: 2 };
            const newPosition: Coordinate = { x: 3, y: 3 };
            player.position = startPosition;

            for (let i = 0; i < SIZE_MAP; i++) {
                for (let j = 0; j < SIZE_MAP; j++) {
                    gameWithPrivateProps._gridState.grid[i] = gameWithPrivateProps._gridState.grid[i] || [];
                    gameWithPrivateProps._gridState.grid[i][j] = {
                        isDoor: false,
                        isTraversable: true,
                        tileCost: 1,
                        spawnpoint: '',
                    };
                }
            }

            const path: Coordinate[] = [startPosition, { x: 2, y: 3 }, { x: 3, y: 3 }];

            const result = game.movePlayer(player._id, newPosition, path);

            expect(result).toBeDefined();
            expect(player.position).toEqual(newPosition);
            expect(player.speed).toBe(originalSpeed - 2);
        });

        it('should not move player if player does not exist', () => {
            const result = game.movePlayer('non-existent', { x: 3, y: 3 }, []);
            expect(result).toBeUndefined();
        });

        it('should not move player if destination is out of bounds', () => {
            const player = game.players[0];
            const outOfBounds: Coordinate = { x: 100, y: 100 };

            const result = game.movePlayer(player._id, outOfBounds, []);

            expect(result).toBeUndefined();
            expect(player.position).not.toEqual(outOfBounds);
        });

        it('should not move player if destination is not traversable', () => {
            const player = game.players[0];
            const wallPosition: Coordinate = { x: 0, y: 1 };

            gameWithPrivateProps._gridState.grid[0] = gameWithPrivateProps._gridState.grid[0] || [];
            gameWithPrivateProps._gridState.grid[0][1] = {
                isDoor: false,
                isTraversable: false,
                tileCost: Infinity,
                spawnpoint: '',
            };

            const result = game.movePlayer(player._id, wallPosition, []);
            expect(result).toBeUndefined();
            expect(player.position).not.toEqual(wallPosition);
        });

        it('should not move player if destination is occupied', () => {
            const player1 = game.players[0];
            const player2 = game.players[1];

            for (let i = 0; i < SIZE_MAP; i++) {
                for (let j = 0; j < SIZE_MAP; j++) {
                    gameWithPrivateProps._gridState.grid[i] = gameWithPrivateProps._gridState.grid[i] || [];
                    gameWithPrivateProps._gridState.grid[i][j] = {
                        isDoor: false,
                        isTraversable: true,
                        tileCost: 1,
                        spawnpoint: '',
                    };
                }
            }

            player2.position = { x: 3, y: 3 };
            const result = game.movePlayer(player1._id, player2.position, []);
            expect(result).toBeUndefined();
            expect(player1.position).not.toEqual(player2.position);
        });

        it('should not move player if path cost exceeds speed', () => {
            const player = game.players[0];
            player.speed = 1;
            const startPos: Coordinate = { x: 0, y: 0 };
            const endPos: Coordinate = { x: 0, y: 3 };
            player.position = startPos;

            for (let i = 0; i < SIZE_MAP; i++) {
                for (let j = 0; j < SIZE_MAP; j++) {
                    gameWithPrivateProps._gridState.grid[i] = gameWithPrivateProps._gridState.grid[i] || [];
                    gameWithPrivateProps._gridState.grid[i][j] = {
                        isDoor: false,
                        isTraversable: true,
                        tileCost: 1,
                        spawnpoint: '',
                    };
                }
            }

            const path: Coordinate[] = [startPos, { x: 0, y: 1 }, { x: 0, y: 2 }, endPos];

            const result = game.movePlayer(player._id, endPos, path);

            expect(result).toBeUndefined();
            expect(player.position).toEqual(startPos);
        });

        it('should teleport a player to a new position', () => {
            const player = game.players[0];
            const originalPosition = { ...player.position };
            const newPosition: Coordinate = { x: 5, y: 5 };

            const result = game.teleportPlayer(player._id, newPosition);

            expect(result).toBeDefined();
            expect(player.position).toEqual(newPosition);
            expect(player.position).not.toEqual(originalPosition);
        });

        it('should not teleport a player if player does not exist', () => {
            const result = game.teleportPlayer('non-existent', { x: 5, y: 5 });
            expect(result).toBeUndefined();
        });
    });

    describe('Debug mode', () => {
        it('should toggle debug mode', () => {
            expect(game.isDebugModeActive).toBe(false);

            game.toggleDebug();
            expect(game.isDebugModeActive).toBe(true);

            game.toggleDebug();
            expect(game.isDebugModeActive).toBe(false);
        });

        it('should deactivate debug mode', () => {
            game.toggleDebug();
            expect(game.isDebugModeActive).toBe(true);

            game.deactivateDebug();
            expect(game.isDebugModeActive).toBe(false);

            game.deactivateDebug();
            expect(game.isDebugModeActive).toBe(false);
        });
    });
});
