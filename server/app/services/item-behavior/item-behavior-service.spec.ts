/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable max-lines */

jest.mock('@app/constants/server-constants', () => {
    const { GameObjects } = require('@common/game/game-enums');

    const mockPassiveBehavior = {
        applyPassiveItemEffect: jest.fn(),
        removePassiveItemEffect: jest.fn(),
    };

    const mockCombatBehavior = {
        applyCombatItemEffect: jest.fn(),
        removeCombatItemEffect: jest.fn(),
    };

    const mockCombatEndBehavior = {
        applyCombatEndItemEffect: jest.fn(),
    };

    return {
        __esModule: true,
        ITEM_BEHAVIORS: {
            [GameObjects.None]: null,
            [GameObjects.SwiftnessBoots]: mockPassiveBehavior,
            [GameObjects.Shield]: mockCombatBehavior,
            [GameObjects.Armor]: mockPassiveBehavior,
            [GameObjects.GladiatorHelm]: mockCombatEndBehavior,
            [GameObjects.Bomb]: mockCombatEndBehavior,
            [GameObjects.Pickaxe]: null,
            [GameObjects.Spawnpoint]: null,
            [GameObjects.Flag]: mockPassiveBehavior,
            [GameObjects.RandomItem]: null,
        },
        mockPassiveBehavior,
        mockCombatBehavior,
        mockCombatEndBehavior,
    };
});

import { Game } from '@app/model/class/game/game';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { GameObjects } from '@common/game/game-enums';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';
import { GameItem, TileState } from '@common/grid/grid-state';
import { mockPlayers } from '@common/player/mock-player';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';

describe('ItemBehaviorService', () => {
    let service: ItemBehaviorService;

    const { mockPassiveBehavior, mockCombatBehavior, mockCombatEndBehavior } = require('@app/constants/server-constants');

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ItemBehaviorService],
        }).compile();

        service = module.get<ItemBehaviorService>(ItemBehaviorService);
        jest.clearAllMocks();
    });

    describe('applyPassiveItemEffect', () => {
        it('should apply passive effect when player doesnt have it', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            } as Player;

            const gameItem: GameItem = {
                item: GameObjects.SwiftnessBoots,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.applyPassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.applyPassiveItemEffect).toHaveBeenCalledWith(effectInfo);
        });

        it('should not apply effect if player already has it', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.SwiftnessBoots],
            };

            const gameItem: GameItem = {
                item: GameObjects.SwiftnessBoots,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.applyPassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.applyPassiveItemEffect).not.toHaveBeenCalled();
        });

        it('should not apply effect for item with no behavior', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.None,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.applyPassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.applyPassiveItemEffect).not.toHaveBeenCalled();
        });
    });

    describe('removePassiveItemEffect', () => {
        it('should call removePassiveItemEffect if player has the effect and behavior exists', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.SwiftnessBoots],
            };

            const gameItem: GameItem = {
                item: GameObjects.SwiftnessBoots,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.removePassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.removePassiveItemEffect).toHaveBeenCalledWith(effectInfo);
        });

        it('should not call removePassiveItemEffect if player does not have the effect', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.SwiftnessBoots,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.removePassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.removePassiveItemEffect).not.toHaveBeenCalled();
        });

        it('should not call removePassiveItemEffect if behavior is null', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.None],
            };

            const gameItem: GameItem = {
                item: GameObjects.None,
                position: { x: 0, y: 0 },
            };

            const effectInfo: PassiveItemEffectInfo = {
                player,
                gameItem,
            };

            service.removePassiveItemEffect(effectInfo);

            expect(mockPassiveBehavior.removePassiveItemEffect).not.toHaveBeenCalled();
        });
    });

    describe('applyCombatItemEffect', () => {
        it("should apply combat effect when player doesn't have it and behavior exists", () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.Shield,
                position: { x: 1, y: 1 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.applyCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.applyCombatItemEffect).toHaveBeenCalledWith(effectInfo);
        });

        it('should not apply combat effect if player already has the buff', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.Shield],
            };

            const gameItem: GameItem = {
                item: GameObjects.Shield,
                position: { x: 2, y: 2 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.applyCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.applyCombatItemEffect).not.toHaveBeenCalled();
        });

        it('should not apply combat effect if item has no behavior', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.None,
                position: { x: 3, y: 3 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.applyCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.applyCombatItemEffect).not.toHaveBeenCalled();
        });
    });

    describe('removeCombatItemEffect', () => {
        it('should remove combat effect if player has it and behavior exists', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.Shield],
            };

            const gameItem: GameItem = {
                item: GameObjects.Shield,
                position: { x: 4, y: 4 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.removeCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.removeCombatItemEffect).toHaveBeenCalledWith(effectInfo);
        });

        it('should not remove combat effect if player does not have it', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.Shield,
                position: { x: 5, y: 5 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.removeCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.removeCombatItemEffect).not.toHaveBeenCalled();
        });

        it('should not remove combat effect if item behavior is null', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [GameObjects.None],
            };

            const gameItem: GameItem = {
                item: GameObjects.None,
                position: { x: 6, y: 6 },
            };

            const effectInfo = {
                player,
                gameItem,
            };

            service.removeCombatItemEffect(effectInfo);

            expect(mockCombatBehavior.removeCombatItemEffect).not.toHaveBeenCalled();
        });
    });

    describe('applyCombatEndItemEffect', () => {
        it('should apply combat end effect if item behavior exists and supports it', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const opposingPlayer: Player = {
                ...mockPlayers[1],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.GladiatorHelm,
                position: { x: 7, y: 7 },
            };

            const effectInfo = {
                gameItem,
                itemHolder: player,
                opposingPlayer,
            };

            mockCombatBehavior.applyCombatEndItemEffect = jest.fn();

            service.applyCombatEndItemEffect(effectInfo);

            expect(mockCombatEndBehavior.applyCombatEndItemEffect).toHaveBeenCalledWith(effectInfo);
        });

        it('should not apply combat end effect if behavior is null', () => {
            const player: Player = {
                ...mockPlayers[0],
                activeBuffs: [],
            };

            const opposingPlayer: Player = {
                ...mockPlayers[1],
                activeBuffs: [],
            };

            const gameItem: GameItem = {
                item: GameObjects.None,
                position: { x: 8, y: 8 },
            };

            const effectInfo = {
                gameItem,
                itemHolder: player,
                opposingPlayer,
            };

            service.applyCombatEndItemEffect(effectInfo);

            expect(mockCombatEndBehavior.applyCombatEndItemEffect).not.toHaveBeenCalled();
        });
    });

    describe('dropAllItems', () => {
        let grid: TileState[][];
        let game: Game;
        let items: GameItem[];
        let itemSet: Set<GameItem>;
        let player: Player;

        beforeEach(() => {
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

            items = [
                { position: { x: -1, y: -1 }, item: GameObjects.Armor },
                { position: { x: -1, y: -1 }, item: GameObjects.SwiftnessBoots },
            ];

            itemSet = new Set<GameItem>(items);

            player = {
                position: { x: 1, y: 1 },
                items: [items[0], items[1]],
                activeBuffs: [GameObjects.Armor],
            } as Player;

            game = {
                gridState: { grid },
                players: [player],
                items: itemSet,
            } as Game;
        });

        it('should remove all items from the player after dropping', () => {
            service.dropAllItems(game, player);
            expect(player.items.length).toBe(0);
        });

        it('should place dropped items on valid tiles that are not occupied', () => {
            const occupiedBefore = new Set<string>();
            game.players.forEach((p) => occupiedBefore.add(`${p.position.x},${p.position.y}`));
            game.items.forEach((i) => occupiedBefore.add(`${i.position.x},${i.position.y}`));

            service.dropAllItems(game, player);

            for (const item of game.items) {
                const key = `${item.position.x},${item.position.y}`;
                expect(item.position).not.toBeNull();
                expect(occupiedBefore.has(key)).toBe(false);
                occupiedBefore.add(key);
            }
        });

        it('should return the same list of players', () => {
            const result = service.dropAllItems(game, player);
            expect(result).toBe(game.players);
        });

        it('should handle player starting outside the grid (getTile returns null)', () => {
            player = {
                position: { x: 1000, y: 1000 },
                items: [items[0]],
                activeBuffs: [GameObjects.Armor],
            } as Player;

            items = [...player.items];
            itemSet = new Set(items);

            game = {
                gridState: { grid },
                players: [player],
                items: itemSet,
            } as Game;

            const result = service.dropAllItems(game, player);

            expect(player.items.length).toBe(0);
            expect(result).toBe(game.players);
        });

        it('should handle an empty grid error case', () => {
            game.gridState.grid = [];
            game.items.clear();

            service.dropAllItems(game, player);
            expect(player.items.length).toBe(0);
        });
    });
});
