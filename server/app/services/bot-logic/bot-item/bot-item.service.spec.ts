/* eslint-disable @typescript-eslint/no-explicit-any */
import { ITEM_CATEGORY_MAP, ItemCategory } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { GameObjects } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { BotItemService } from './bot-item.service';

describe('BotItemService', () => {
    let service: BotItemService;
    let gameManagerServiceMock: jest.Mocked<GameManagerService>;

    const mockBot: Player = {
        _id: 'bot1',
        name: 'Bot 1',
        position: { x: 1, y: 1 },
        isAggressive: true,
    } as Player;

    const mockOffensiveItem = {
        position: { x: 2, y: 2 },
        item: GameObjects.Bomb,
    };

    const mockDefensiveItem = {
        position: { x: 3, y: 3 },
        item: GameObjects.Shield,
    };

    const mockFlag = {
        position: { x: 5, y: 5 },
        item: GameObjects.Flag,
    };

    const mockItems = [mockOffensiveItem, mockDefensiveItem, mockFlag];

    const mockGame: Partial<Game> = {
        id: 'game1',
        items: new Set(mockItems),
    };

    const mockPathToOffensiveItem = [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
        { x: 2, y: 2 },
    ];

    const mockPathToDefensiveItem = [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
        { x: 3, y: 3 },
    ];

    beforeEach(async () => {
        gameManagerServiceMock = {
            getShortestPathToTileForBots: jest.fn(),
        } as unknown as jest.Mocked<GameManagerService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                BotItemService,
                {
                    provide: GameManagerService,
                    useValue: gameManagerServiceMock,
                },
            ],
        }).compile();

        service = module.get<BotItemService>(BotItemService);

        (ITEM_CATEGORY_MAP as any)[GameObjects.Bomb] = ItemCategory.Offensive;
        (ITEM_CATEGORY_MAP as any)[GameObjects.Shield] = ItemCategory.Defensive;
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findClosestItemByCategory', () => {
        it('should return the closest offensive item for aggressive bot', () => {
            gameManagerServiceMock.getShortestPathToTileForBots
                .mockReturnValueOnce(mockPathToOffensiveItem)
                .mockReturnValueOnce(mockPathToDefensiveItem);

            const result = service.findClosestItemByCategory(mockGame as Game, mockBot);

            expect(result).toEqual(mockOffensiveItem);
            expect(gameManagerServiceMock.getShortestPathToTileForBots).toHaveBeenCalledWith(mockGame.id, mockBot._id, mockOffensiveItem.position);
        });

        it('should return the closest defensive item for defensive bot', () => {
            const defensiveBot = { ...mockBot, isAggressive: false };
            gameManagerServiceMock.getShortestPathToTileForBots
                .mockReturnValueOnce(mockPathToDefensiveItem)
                .mockReturnValueOnce(mockPathToOffensiveItem);

            const result = service.findClosestItemByCategory(mockGame as Game, defensiveBot);

            expect(result).toEqual(mockDefensiveItem);
            expect(gameManagerServiceMock.getShortestPathToTileForBots).toHaveBeenCalledWith(
                mockGame.id,
                defensiveBot._id,
                mockDefensiveItem.position,
            );
        });

        it('should fallback to other category if no items in preferred category are available', () => {
            const gameWithNoOffensiveItems: Partial<Game> = {
                id: 'game2',
                items: new Set([mockDefensiveItem, mockFlag]),
            };

            gameManagerServiceMock.getShortestPathToTileForBots.mockReturnValueOnce(mockPathToDefensiveItem);

            const result = service.findClosestItemByCategory(gameWithNoOffensiveItems as Game, mockBot);

            expect(result).toEqual(mockDefensiveItem);
        });

        it('should return null if no items are available', () => {
            const gameWithNoItems: Partial<Game> = {
                id: 'game3',
                items: new Set(),
            };

            const result = service.findClosestItemByCategory(gameWithNoItems as Game, mockBot);

            expect(result).toBeNull();
        });

        it('should return null if no valid paths to items are found', () => {
            gameManagerServiceMock.getShortestPathToTileForBots.mockReturnValue(null);

            const result = service.findClosestItemByCategory(mockGame as Game, mockBot);

            expect(result).toBeNull();
        });
    });

    describe('getItemsBasedOnStrategy', () => {
        it('should return offensive items for aggressive strategy', () => {
            const getAgressiveItemsSpy = jest.spyOn(service, 'getAgressiveItems');

            service.getItemsBasedOnStrategy(mockGame as Game, true);

            expect(getAgressiveItemsSpy).toHaveBeenCalledWith(mockGame);
        });

        it('should return defensive items for defensive strategy', () => {
            const getDefensiveItemsSpy = jest.spyOn(service, 'getDefensiveItems');

            service.getItemsBasedOnStrategy(mockGame as Game, false);

            expect(getDefensiveItemsSpy).toHaveBeenCalledWith(mockGame);
        });
    });

    describe('hasValidItems', () => {
        it('should return true for valid items array', () => {
            const validItems = [
                { position: { x: 1, y: 1 }, item: GameObjects.Bomb },
                { position: { x: 2, y: 2 }, item: GameObjects.Shield },
            ];

            const result = service.hasValidItems(validItems);

            expect(result).toBe(true);
        });

        it('should return false for empty items array', () => {
            const result = service.hasValidItems([]);

            expect(result).toBe(false);
        });

        it('should return false if position is invalid (-1, -1)', () => {
            const invalidItems = [{ position: { x: -1, y: -1 }, item: GameObjects.Bomb }];

            const result = service.hasValidItems(invalidItems);

            expect(result).toBe(false);
        });
    });

    describe('findClosestItemByPath', () => {
        it('should return the item with the shortest path', () => {
            const items = [mockOffensiveItem, mockDefensiveItem];

            gameManagerServiceMock.getShortestPathToTileForBots
                .mockReturnValueOnce(mockPathToOffensiveItem)
                .mockReturnValueOnce(mockPathToDefensiveItem);

            const result = service.findClosestItemByPath(mockGame as Game, mockBot, items);

            expect(result).toEqual(mockOffensiveItem);
        });

        it('should return null if no valid paths are found', () => {
            const items = [mockOffensiveItem, mockDefensiveItem];

            gameManagerServiceMock.getShortestPathToTileForBots.mockReturnValue(null);

            const result = service.findClosestItemByPath(mockGame as Game, mockBot, items);

            expect(result).toBeNull();
        });

        it('should return null if paths are empty', () => {
            const items = [mockOffensiveItem, mockDefensiveItem];

            gameManagerServiceMock.getShortestPathToTileForBots.mockReturnValue([]);

            const result = service.findClosestItemByPath(mockGame as Game, mockBot, items);

            expect(result).toBeNull();
        });
    });

    describe('getAgressiveItems', () => {
        it('should return only offensive items', () => {
            const itemWithoutCategory = { position: { x: 4, y: 4 }, item: GameObjects.RandomItem };
            const gameWithMixedItems: Partial<Game> = {
                items: new Set([mockOffensiveItem, mockDefensiveItem, mockFlag, itemWithoutCategory]),
            };

            const result = service.getAgressiveItems(gameWithMixedItems as Game);

            expect(result).toEqual([mockOffensiveItem]);
        });

        it('should handle empty items', () => {
            const gameWithNoItems: Partial<Game> = {
                items: new Set(),
            };

            const result = service.getAgressiveItems(gameWithNoItems as Game);

            expect(result).toEqual([]);
        });
    });

    describe('getDefensiveItems', () => {
        it('should return only defensive items', () => {
            const itemWithoutCategory = { position: { x: 4, y: 4 }, item: GameObjects.RandomItem };
            const gameWithMixedItems: Partial<Game> = {
                items: new Set([mockOffensiveItem, mockDefensiveItem, mockFlag, itemWithoutCategory]),
            };

            const result = service.getDefensiveItems(gameWithMixedItems as Game);

            expect(result).toEqual([mockDefensiveItem]);
        });

        it('should handle empty items', () => {
            const gameWithNoItems: Partial<Game> = {
                items: new Set(),
            };

            const result = service.getDefensiveItems(gameWithNoItems as Game);

            expect(result).toEqual([]);
        });
    });

    describe('findFlagPosition', () => {
        it('should return the flag position if it exists and is valid', () => {
            const result = service.findFlagPosition(mockGame as Game);

            expect(result).toEqual(mockFlag.position);
        });

        it('should return null if flag position is invalid (-1, -1)', () => {
            const flagWithInvalidPosition = {
                position: { x: -1, y: -1 },
                item: GameObjects.Flag,
            };

            const gameWithInvalidFlagPosition: Partial<Game> = {
                items: new Set([mockOffensiveItem, mockDefensiveItem, flagWithInvalidPosition]),
            };

            const result = service.findFlagPosition(gameWithInvalidFlagPosition as Game);

            expect(result).toBeNull();
        });

        it('should return null if no flag is found', () => {
            const gameWithoutFlag: Partial<Game> = {
                items: new Set([mockOffensiveItem, mockDefensiveItem]),
            };

            const result = service.findFlagPosition(gameWithoutFlag as Game);

            expect(result).toBeNull();
        });
    });
});
