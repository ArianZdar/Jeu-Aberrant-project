/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { GameObjects } from '@common/game/game-enums';
import { CombatEndItemEffectInfo } from '@common/game/item-effect-info';
import { GameItem, TileState } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { BombBehavior } from './bomb-behavior';

describe('BombBehavior', () => {
    let bombBehavior: BombBehavior;
    let combatEndItemEffectInfo: CombatEndItemEffectInfo;
    let game: Game;
    let itemHolder: Player;
    let opposingPlayer: Player;
    let dummyGameItem: GameItem;
    let grid: TileState[][];

    beforeEach(() => {
        bombBehavior = new BombBehavior();

        dummyGameItem = { position: { x: 0, y: 0 }, item: GameObjects.SwiftnessBoots };

        itemHolder = {
            healthPower: 0,
            position: { x: 0, y: 0 },
        } as Player;

        opposingPlayer = {
            healthPower: 100,
            position: { x: 5, y: 5 },
            spawnPointPosition: { x: 0, y: 0 },
        } as Player;

        grid = [
            [
                { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'A' },
                { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'B' },
            ],
            [
                { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'C' },
                { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'D' },
            ],
        ];

        game = {
            gridState: { grid },
            players: [{ position: { x: 1, y: 1 } } as Player],
        } as Game;

        combatEndItemEffectInfo = {
            gameItem: dummyGameItem,
            itemHolder,
            opposingPlayer,
            game,
        };
    });

    describe('applyCombatEndItemEffect', () => {
        it('should update opposingPlayer position when itemHolder.healthPower <= 0 and available tile is found', () => {
            opposingPlayer.position = { x: 10, y: 10 };
            bombBehavior.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(opposingPlayer.position).toEqual({ x: 0, y: 0 });
        });

        it('should not update opposingPlayer position when itemHolder.healthPower > 0', () => {
            itemHolder.healthPower = 10;
            const originalPosition = { x: 20, y: 20 };
            opposingPlayer.position = originalPosition;
            bombBehavior.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(opposingPlayer.position).toEqual(originalPosition);
        });

        it('should set opposingPlayer.position to undefined when game is not provided', () => {
            itemHolder.healthPower = 0;
            opposingPlayer.position = { x: 30, y: 30 };
            combatEndItemEffectInfo.game = undefined;
            bombBehavior.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(opposingPlayer.position).toBeUndefined();
        });
    });

    describe('findClosestTileToSpawnpoint (private)', () => {
        const callFindClosestTile = (gameInstance: Game, spawnPoint: Coordinate): Coordinate | null => {
            return (bombBehavior as any).findClosestTileToSpawnpoint(gameInstance, spawnPoint);
        };

        it('should return undefined when game is null', () => {
            const result = callFindClosestTile(null as any, { x: 0, y: 0 });
            expect(result).toBeUndefined();
        });

        it('should return spawnPoint if the tile at spawnPoint is available', () => {
            const spawnPoint: Coordinate = { x: 1, y: 1 };
            const localGrid: TileState[][] = [
                [
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'X' },
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'Y' },
                ],
                [
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'Z' },
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'W' },
                ],
            ];
            const localGame: Game = {
                gridState: { grid: localGrid },
                players: [],
            } as Game;

            const result = callFindClosestTile(localGame, spawnPoint);
            expect(result).toEqual(spawnPoint);
        });

        it('should search neighbors if spawnPoint is not available and return the first available tile', () => {
            const spawnPoint: Coordinate = { x: 0, y: 0 };
            const localGrid: TileState[][] = [
                [
                    { isDoor: false, isTraversable: true, tileCost: Infinity, spawnpoint: 'Block' },
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'Open' },
                ],
                [
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'Open' },
                    { isDoor: false, isTraversable: true, tileCost: 1, spawnpoint: 'Open' },
                ],
            ];
            const localGame: Game = {
                gridState: { grid: localGrid },
                players: [],
            } as Game;

            const result = callFindClosestTile(localGame, spawnPoint);

            expect(result).toEqual(expect.objectContaining({ x: expect.any(Number), y: expect.any(Number) }));
            const validResults = [
                { x: 1, y: 0 },
                { x: 0, y: 1 },
                { x: 1, y: 1 },
            ];
            const found = validResults.some((coord) => coord.x === result!.x && coord.y === result!.y);
            expect(found).toBe(true);
        });

        it('should return null if no available tile is found', () => {
            const spawnPoint: Coordinate = { x: 0, y: 0 };
            const localGrid: TileState[][] = [
                [
                    { isDoor: false, isTraversable: true, tileCost: Infinity, spawnpoint: 'Block' },
                    { isDoor: false, isTraversable: true, tileCost: Infinity, spawnpoint: 'Block' },
                ],
                [
                    { isDoor: false, isTraversable: true, tileCost: Infinity, spawnpoint: 'Block' },
                    { isDoor: false, isTraversable: true, tileCost: Infinity, spawnpoint: 'Block' },
                ],
            ];
            const localGame: Game = {
                gridState: { grid: localGrid },
                players: [],
            } as Game;

            const result = callFindClosestTile(localGame, spawnPoint);
            expect(result).toBeNull();
        });
    });
});
