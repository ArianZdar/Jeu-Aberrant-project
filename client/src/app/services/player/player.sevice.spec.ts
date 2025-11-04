/* eslint-disable max-lines */
import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Player } from '@common/player/player';
import { PlayerService } from './player.service';
import { skip } from 'rxjs/operators';
import { mockPlayers } from '@app/constants/mocks';
import { Coordinate, Tile } from '@common/game/game-info';
import { MOVEMENT_DELAY_MS } from '@app/constants/client-constants';

describe('PlayerService', () => {
    let service: PlayerService;

    const INVALID_POSITION = 99;
    const UPDATED_TIMER_VALUE = 45;
    const PLAYER_WINS_COUNT = 3;
    const UNINITIALIZED_VALUE = -1;
    const DEFAULT_FIGHT_WINS = 0;
    const GRID_SIZE = 5;
    const PLAYER_POSITION_X = 5;
    const PLAYER_POSITION_Y = 5;
    const TEST_TIMER_VALUE = 30;
    const TEST_FIGHT_WINS = 5;
    const ANIMATION_TICK_TIME = 10;
    const FAR_POSITION = 7;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [PlayerService],
        });
        service = TestBed.inject(PlayerService);
    });

    describe('Initialisation', () => {
        it('should be created', () => {
            expect(service).toBeTruthy();
        });

        it('should initialize with empty players array', () => {
            expect(service.players.length).toBe(0);
        });
    });

    describe('Players management', () => {
        it('should set and get players', () => {
            service.setPlayers(mockPlayers);
            expect(service.getPlayers()).toEqual(mockPlayers);
            expect(service.players).toEqual(mockPlayers);
        });

        it('should set main player ID', () => {
            service.setMainPlayerId('player1');
            expect(service.getMainPlayerId()).toBe('player1');
        });

        it('should get main player stats as observable', (done) => {
            service.setMainPlayerId('player1');
            service.setPlayers(mockPlayers);

            service.getMainPlayerStats().subscribe((player) => {
                expect(player).toEqual(mockPlayers[0]);
                done();
            });
        });

        it('should get main player', () => {
            service.setMainPlayerId('player1');
            service.setPlayers(mockPlayers);

            const mainPlayer = service.getMainPlayer();
            expect(mainPlayer).toEqual(mockPlayers[0]);
        });

        it('should return undefined if main player ID is not set', () => {
            service.setMainPlayerId(null);
            service.setPlayers(mockPlayers);

            const mainPlayer = service.getMainPlayer();
            expect(mainPlayer).toBeUndefined();
        });

        it('should return undefined if no player at position', () => {
            service.setPlayers(mockPlayers);

            const playerAtPos = service.getPlayerAtPosition(INVALID_POSITION, INVALID_POSITION);
            expect(playerAtPos).toBeUndefined();
        });

        it('should update mainPlayerStats when currentClientPlayerId exists', (done) => {
            service.setMainPlayerId('player1');
            service.setPlayers(mockPlayers);

            service.getMainPlayerStats().subscribe((player) => {
                expect(player).toEqual(mockPlayers[0]);
                done();
            });
        });

        it('should not update mainPlayerStats when currentClientPlayerId not found', (done) => {
            service.setMainPlayerId('player1');
            service.setPlayers(mockPlayers);

            service.setMainPlayerId('invalid_id');
            service.setPlayers(mockPlayers);

            service.getMainPlayerStats().subscribe((player) => {
                expect(player).toEqual(mockPlayers[0]);
                done();
            });
        });
    });

    describe('Player updates and connections', () => {
        it('should mark players as connected when updating with new players', () => {
            const newPlayers = [{ _id: 'player1', name: 'Player 1', position: { x: 1, y: 1 } } as Player];

            service.updatePlayer(newPlayers);

            expect(service.players[0].isConnected).toBe(true);
        });

        it('should mark missing players as disconnected when updating', () => {
            service.setPlayers([
                {
                    _id: 'player1',
                    name: 'Player 1',
                    position: { x: 1, y: 1 },
                    isConnected: true,
                } as Player,
                {
                    _id: 'player2',
                    name: 'Player 2',
                    position: { x: 2, y: 2 },
                    isConnected: true,
                } as Player,
            ]);

            const newPlayers = [{ _id: 'player1', name: 'Player 1 Updated', position: { x: 1, y: 1 } } as Player];

            service.updatePlayer(newPlayers);

            const player2 = service.players.find((p) => p._id === 'player2');
            expect(player2?.isConnected).toBe(false);
        });

        it('should update main player stats when updating players and main player ID is set', (done) => {
            service.setMainPlayerId('player1');

            const newPlayers = [
                {
                    _id: 'player1',
                    name: 'Updated Main Player',
                    position: { x: 3, y: 3 },
                } as Player,
            ];

            service
                .getMainPlayerStats()
                .pipe(skip(1))
                .subscribe((stats) => {
                    expect(stats._id).toBe('player1');
                    expect(stats.name).toBe('Updated Main Player');
                    done();
                });

            service.updatePlayer(newPlayers);
        });
    });

    describe('Fight wins tracking', () => {
        it('should update player fight wins', () => {
            service.updatePlayerFightWins('player1', PLAYER_WINS_COUNT);

            let wins = UNINITIALIZED_VALUE;
            service.getPlayerFightWins('player1').subscribe((value) => {
                wins = value;
            });

            expect(wins).toBe(PLAYER_WINS_COUNT);
        });

        it('should return 0 for players with no recorded wins', () => {
            let wins = UNINITIALIZED_VALUE;
            service.getPlayerFightWins('nonexistent').subscribe((value) => {
                wins = value;
            });

            expect(wins).toBe(DEFAULT_FIGHT_WINS);
        });
    });

    describe('Turn timer', () => {
        it('should update turn timer', () => {
            service.updateTurnTimer(UPDATED_TIMER_VALUE);

            let timerValue = UNINITIALIZED_VALUE;
            service.getTurnTimer().subscribe((value) => {
                timerValue = value;
            });

            expect(timerValue).toBe(UPDATED_TIMER_VALUE);
        });
    });

    describe('Turn management', () => {
        it('should return false when current player is not the turn player', () => {
            service.setMainPlayerId('player1');
            service.setCurrentTurnPlayerId('player2');

            const isTurn = service.isCurrentPlayerTurn;
            expect(isTurn).toBe(false);
        });

        it('should get current turn player ID value directly', () => {
            const testPlayerId = 'player42';
            service.setCurrentTurnPlayerId(testPlayerId);

            const turnPlayerId = service.getCurrentTurnPlayerIdValue();
            expect(turnPlayerId).toBe(testPlayerId);
        });
    });

    describe('Player movement animation', () => {
        beforeEach(() => {
            service.reset();
        });
        it('should animate player movement along a path', fakeAsync(() => {
            const mockPath: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
                { x: 2, y: 0 },
            ];

            service.setPlayers(mockPlayers);
            const playerToAnimate = { ...mockPlayers[0] };
            const finalPlayers = [{ ...playerToAnimate, position: { x: 2, y: 0 } }, mockPlayers[1]];

            const updatePlayerSpy = spyOn(service, 'updatePlayer').and.callThrough();

            service.animatePlayerMovement(playerToAnimate._id, mockPath, finalPlayers);

            tick(MOVEMENT_DELAY_MS);

            expect(updatePlayerSpy).toHaveBeenCalled();
            const playerAfterFirstStep = service.players.find((p) => p._id === playerToAnimate._id);
            expect(playerAfterFirstStep?.position).toEqual({ x: 1, y: 0 });

            tick(MOVEMENT_DELAY_MS);

            tick();

            const playerAfterAnimation = service.players.find((p) => p._id === playerToAnimate._id);
            expect(playerAfterAnimation?.position).toEqual({ x: 2, y: 0 });
        }));

        it('should resolve immediately if path is empty or has only one point', fakeAsync(() => {
            service.setPlayers(mockPlayers);
            const updatePlayerSpy = spyOn(service, 'updatePlayer').and.callThrough();

            const emptyPath: Coordinate[] = [];
            const finalPlayers = mockPlayers;

            service.animatePlayerMovement('player1', emptyPath, finalPlayers);
            tick();
            expect(updatePlayerSpy).toHaveBeenCalledWith(finalPlayers);

            updatePlayerSpy.calls.reset();

            const singlePointPath: Coordinate[] = [{ x: 0, y: 0 }];
            service.animatePlayerMovement('player1', singlePointPath, finalPlayers);
            tick();
            expect(updatePlayerSpy).toHaveBeenCalledWith(finalPlayers);
        }));

        it('should clear existing animation for a player if a new one starts', fakeAsync(() => {
            const mockPath: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];

            service.setPlayers(mockPlayers);
            const clearIntervalSpy = spyOn(window, 'clearInterval').and.callThrough();

            service.animatePlayerMovement('player1', mockPath, mockPlayers);

            service.animatePlayerMovement('player1', mockPath, mockPlayers);

            expect(clearIntervalSpy).toHaveBeenCalled();

            tick(MOVEMENT_DELAY_MS * 2);
            tick();
        }));

        it('should filter out disconnected players when updating after animation', fakeAsync(() => {
            const mockPath: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];

            const finalPlayers = [
                { ...mockPlayers[0], position: { x: 1, y: 0 } },
                { ...mockPlayers[1], isConnected: false },
            ];

            service.setPlayers(mockPlayers);
            const updatePlayerSpy = spyOn(service, 'updatePlayer').and.callThrough();

            service.animatePlayerMovement('player1', mockPath, finalPlayers);
            tick(MOVEMENT_DELAY_MS * 2);
            tick();

            const lastCall = updatePlayerSpy.calls.mostRecent();
            expect(lastCall.args[0]).toEqual([finalPlayers[0]]);
        }));
    });

    describe('Player lookup and connection status', () => {
        beforeEach(() => {
            service.setPlayers(mockPlayers);
        });

        it('should get player by ID', () => {
            const player = service.getPlayerById('player1');
            expect(player).toEqual(mockPlayers[0]);
        });

        it('should return undefined for non-existent player ID', () => {
            const player = service.getPlayerById('nonexistent');
            expect(player).toBeUndefined();
        });

        it('should return undefined when getPlayerById is called with empty ID', () => {
            const player = service.getPlayerById('');
            expect(player).toBeUndefined();
        });
    });

    describe('Turn player management', () => {
        beforeEach(() => {
            service.setPlayers(mockPlayers);
        });

        it('should set current turn player ID', fakeAsync(() => {
            const testPlayerId = 'player2';
            let capturedId: string | null = null;

            const subscription = service.getCurrentTurnPlayerId().subscribe((id) => {
                capturedId = id;
            });

            service.setCurrentTurnPlayerId(testPlayerId);
            tick();

            expect(capturedId !== null).toBe(true);
            if (capturedId !== null) {
                expect(capturedId).toBe(testPlayerId);
            }

            subscription.unsubscribe();
        }));

        it('should skip disconnected players when setting turn player', fakeAsync(() => {
            const modifiedPlayers = [{ ...mockPlayers[0], isConnected: false }, mockPlayers[1]];
            service.setPlayers(modifiedPlayers);

            let capturedId: string | null = null;
            const subscription = service.getCurrentTurnPlayerId().subscribe((id) => {
                capturedId = id;
            });

            service.setCurrentTurnPlayerId('player1');
            tick();

            expect(capturedId !== null).toBe(true);
            if (capturedId !== null) {
                expect(capturedId).toBe('player2');
            }

            subscription.unsubscribe();
        }));

        it('should reset the turn timer when setting a new turn player', () => {
            const resetTimerSpy = spyOn(service, 'resetTurnTimer');
            service.setCurrentTurnPlayerId('player2');
            expect(resetTimerSpy).toHaveBeenCalled();
        });

        it('should cycle through multiple players to find the next connected one', fakeAsync(() => {
            const multipleDisconnectedPlayers = [
                { ...mockPlayers[0], isConnected: false },
                { ...mockPlayers[1], isConnected: false },
                { _id: 'player3', name: 'Player 3', isConnected: true, position: { x: 2, y: 2 } } as Player,
                { _id: 'player4', name: 'Player 4', isConnected: true, position: { x: 3, y: 3 } } as Player,
            ];
            service.setPlayers(multipleDisconnectedPlayers);

            let capturedId: string | null = null;
            const subscription = service.getCurrentTurnPlayerId().subscribe((id) => {
                capturedId = id;
            });

            service.setCurrentTurnPlayerId('player1');
            tick();

            expect(capturedId !== null).toBe(true);
            expect(capturedId === 'player3').toBe(true);

            subscription.unsubscribe();
        }));
    });

    describe('Player adjacency checks', () => {
        beforeEach(() => {
            const playerWithPosition = {
                ...mockPlayers[0],
                position: { x: PLAYER_POSITION_X, y: PLAYER_POSITION_Y },
            };

            service.setPlayers([playerWithPosition, mockPlayers[1]]);
            service.setMainPlayerId('player1');
        });

        it('should detect coordinates adjacent to the main player', () => {
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X, y: PLAYER_POSITION_Y + 1 })).toBe(true);
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X + 1, y: PLAYER_POSITION_Y })).toBe(true);
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X, y: PLAYER_POSITION_Y - 1 })).toBe(true);
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X - 1, y: PLAYER_POSITION_Y })).toBe(true);
        });

        it('should return false for non-adjacent coordinates', () => {
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X + 1, y: PLAYER_POSITION_Y + 1 })).toBe(false);
            expect(service.isMainPlayerAdjacent({ x: FAR_POSITION, y: PLAYER_POSITION_Y })).toBe(false);
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X, y: FAR_POSITION })).toBe(false);
        });

        it('should return undefined if no main player is set', () => {
            service.setMainPlayerId(null);
            expect(service.isMainPlayerAdjacent({ x: PLAYER_POSITION_X, y: 6 })).toBeUndefined();
        });
    });

    describe('Turn continuation checks', () => {
        let tiles: Tile[][];

        beforeEach(() => {
            tiles = Array(GRID_SIZE)
                .fill(0)
                .map(() =>
                    Array(GRID_SIZE)
                        .fill(0)
                        .map(() => {
                            return { tileType: 'terrain', material: 'grass', isSpawnPoint: false };
                        }),
                );

            tiles[2][3] = { tileType: 'door', material: './assets/door.png', isSpawnPoint: false };
            tiles[3][2] = { tileType: 'terrain', material: './assets/ice.png', isSpawnPoint: false };

            const player = {
                ...mockPlayers[0],
                position: { x: 2, y: 2 },
                speed: 0,
                actionPoints: 1,
            };

            service.setPlayers([player, mockPlayers[1]]);
            service.setMainPlayerId('player1');
            service.setCurrentTurnPlayerId('player1');

            Object.defineProperty(service, 'isCurrentPlayerTurn', { value: true });
        });

        it('should return false if main player is not set', () => {
            service.setMainPlayerId(null);
            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(false);
        });

        it('should return true if it is not the current player turn', () => {
            Object.defineProperty(service, 'isCurrentPlayerTurn', { value: false });
            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });

        it('should return true if player has movement speed remaining', () => {
            const playerWithSpeed = {
                ...mockPlayers[0],
                position: { x: 2, y: 2 },
                speed: 1,
            };
            service.setPlayers([playerWithSpeed, mockPlayers[1]]);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });

        it('should return true if player has action points and there is a door adjacent', () => {
            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });

        it('should return true if there is an ice tile adjacent', () => {
            const playerNoActions = {
                ...mockPlayers[0],
                position: { x: 2, y: 2 },
                speed: 0,
                actionPoints: 0,
            };
            service.setPlayers([playerNoActions, mockPlayers[1]]);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });

        it('should return true if there is an adjacent connected player and player has action points', () => {
            const adjacentPlayers = [
                { ...mockPlayers[0], position: { x: 2, y: 2 }, speed: 0, actionPoints: 1 },
                { ...mockPlayers[1], position: { x: 3, y: 2 }, isConnected: true },
            ];
            service.setPlayers(adjacentPlayers);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });

        it('should return false if adjacent player is disconnected', () => {
            for (let y = 0; y < GRID_SIZE; y++) {
                for (let x = 0; x < GRID_SIZE; x++) {
                    tiles[y][x] = { tileType: 'terrain', material: 'grass', isSpawnPoint: false };
                }
            }

            const adjacentPlayers = [
                { ...mockPlayers[0], position: { x: 2, y: 2 }, speed: 0, actionPoints: 1 },
                { ...mockPlayers[1], position: { x: 3, y: 2 }, isConnected: false },
            ];
            service.setPlayers(adjacentPlayers);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(false);
        });

        it('should return false if there are no valid moves and player has no speed', () => {
            tiles[2][3] = { tileType: 'terrain', material: 'grass', isSpawnPoint: false };
            tiles[3][2] = { tileType: 'terrain', material: 'grass', isSpawnPoint: false };

            const isolatedPlayer = {
                ...mockPlayers[0],
                position: { x: 2, y: 2 },
                speed: 0,
                actionPoints: 1,
            };
            service.setPlayers([isolatedPlayer]);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(false);
        });

        it('should handle grid boundaries correctly', () => {
            const edgePlayer = {
                ...mockPlayers[0],
                position: { x: 0, y: 0 },
                speed: 0,
                actionPoints: 1,
            };
            service.setPlayers([edgePlayer, mockPlayers[1]]);

            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(false);

            tiles[1][0] = { tileType: 'terrain', material: './assets/ice.png', isSpawnPoint: false };
            expect(service.continueTurn(tiles, GRID_SIZE)).toBe(true);
        });
    });

    describe('Service reset functionality', () => {
        beforeEach(() => {
            service.setPlayers(mockPlayers);
        });

        it('should clear all animations when reset is called', fakeAsync(() => {
            const mockPath: Coordinate[] = [
                { x: 0, y: 0 },
                { x: 1, y: 0 },
            ];

            const clearIntervalSpy = spyOn(window, 'clearInterval').and.callThrough();

            service.animatePlayerMovement('player1', mockPath, mockPlayers);
            service.animatePlayerMovement('player2', mockPath, mockPlayers);

            clearIntervalSpy.calls.reset();

            service.reset();

            expect(clearIntervalSpy).toHaveBeenCalled();
            expect(clearIntervalSpy.calls.count()).toBeGreaterThan(0);

            clearIntervalSpy.calls.reset();
            service.animatePlayerMovement('player1', mockPath, mockPlayers);
            tick(ANIMATION_TICK_TIME);

            expect(clearIntervalSpy.calls.count()).toBe(0);
        }));

        it('should reset all service properties', () => {
            service.setMainPlayerId('player1');
            service.isCurrentPlayerTurn = true;
            service.updateTurnTimer(TEST_TIMER_VALUE);
            service.updatePlayerFightWins('player1', TEST_FIGHT_WINS);
            service.setCurrentTurnPlayerId('player2');

            service.reset();

            expect(service.players.length).toBe(0);
            expect(service.getMainPlayerId()).toBeNull();
            expect(service.isCurrentPlayerTurn).toBe(false);

            let timerValue = -1;
            service.getTurnTimer().subscribe((val) => {
                timerValue = val;
            });
            expect(timerValue).toBe(0);

            let currentTurnPlayer: string | null = 'not-null';
            service.getCurrentTurnPlayerId().subscribe((id) => {
                currentTurnPlayer = id;
            });
            expect(currentTurnPlayer === null).toBe(true);

            let fightWins = -1;
            service.getPlayerFightWins('player1').subscribe((wins) => {
                fightWins = wins;
            });
            expect(fightWins).toBe(0);
        });
    });
});
