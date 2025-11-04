import { Game } from '@app/model/class/game/game';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { GameItem } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server } from 'socket.io';
import { ItemManagerService } from './item-manager.service';

describe('ItemManagerService', () => {
    let service: ItemManagerService;
    let mockServer: Partial<Server>;

    let gameManagerServiceMock: Partial<GameManagerService>;
    let itemBehaviorServiceMock: Partial<ItemBehaviorService>;

    const mockGameId = 'game-123';
    const mockPlayerId = 'player-123';

    const mockPosition: Coordinate = { x: 5, y: 5 };

    const mockShieldItem: GameItem = {
        position: { x: 5, y: 5 },
        item: GameObjects.Shield,
    };

    const mockBoostItem: GameItem = {
        position: { x: 6, y: 6 },
        item: GameObjects.SwiftnessBoots,
    };

    const mockPlayer: Partial<Player> = {
        _id: mockPlayerId,
        position: { x: 4, y: 4 },
        items: [mockShieldItem],
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockPlayer as Player],
        items: new Set([mockBoostItem]),
    };

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        gameManagerServiceMock = {
            findGameByPlayerId: jest.fn().mockReturnValue(mockGame),
            pickupItem: jest.fn().mockReturnValue(true),
        };

        itemBehaviorServiceMock = {
            removePassiveItemEffect: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ItemManagerService,
                { provide: GameManagerService, useValue: gameManagerServiceMock },
                { provide: ItemBehaviorService, useValue: itemBehaviorServiceMock },
            ],
        }).compile();

        service = module.get<ItemManagerService>(ItemManagerService);
        service.setServer(mockServer as Server);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server instance', () => {
            const newServer = {
                emit: jest.fn(),
                to: jest.fn().mockReturnThis(),
            } as unknown as Server;

            service.setServer(newServer);

            service.pickupItem(mockPlayerId, mockPosition);
            expect(newServer.to).toHaveBeenCalled();
        });
    });

    describe('getItems', () => {
        it('should return items for a game', () => {
            const result = service.getItems(mockPlayerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(result).toEqual([mockBoostItem]);
        });

        it('should return empty array if game is not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            const result = service.getItems(mockPlayerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(result).toEqual([]);
        });
    });

    describe('pickupItem', () => {
        it('should pick up an item and emit updated items', () => {
            service.pickupItem(mockPlayerId, mockPosition);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.pickupItem).toHaveBeenCalledWith(mockGame, mockPlayerId, mockPosition);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems, mockGame.players);
        });

        it('should emit InventoryFull if item cannot be picked up', () => {
            gameManagerServiceMock.pickupItem = jest.fn().mockReturnValue(false);

            service.pickupItem(mockPlayerId, mockPosition);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(gameManagerServiceMock.pickupItem).toHaveBeenCalledWith(mockGame, mockPlayerId, mockPosition);
            expect(mockServer.to).toHaveBeenCalledWith(mockPlayerId);
            expect(mockServer.to(mockPlayerId).emit).toHaveBeenCalledWith(GameGatewayEvents.InventoryFull);
        });
    });

    describe('dropItem', () => {
        it('should drop an item from player inventory and emit updated items', () => {
            const mockPlayerWithItem = {
                ...mockPlayer,
                items: [{ ...mockShieldItem }],
            };

            const mockGameWithPlayerAndItem = {
                ...mockGame,
                players: [mockPlayerWithItem as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(mockGameWithPlayerAndItem);

            service.dropItem(mockPlayerId, mockShieldItem);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.removePassiveItemEffect).toHaveBeenCalledWith({
                player: mockPlayerWithItem,
                gameItem: expect.objectContaining({
                    item: mockShieldItem.item,
                }),
            });
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.UpdateItems, expect.any(Array));
            expect(mockPlayerWithItem.items).toHaveLength(0);
        });

        it('should not drop an item if game is not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            service.dropItem(mockPlayerId, mockShieldItem);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.removePassiveItemEffect).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not drop an item if player is not found', () => {
            const gameWithoutPlayer = {
                ...mockGame,
                players: [],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithoutPlayer);

            service.dropItem(mockPlayerId, mockShieldItem);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.removePassiveItemEffect).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not drop an item if item is not in player inventory', () => {
            const playerWithoutItem = {
                ...mockPlayer,
                items: [],
            };

            const gameWithPlayerWithoutItem = {
                ...mockGame,
                players: [playerWithoutItem as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithPlayerWithoutItem);

            service.dropItem(mockPlayerId, mockShieldItem);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockPlayerId);
            expect(itemBehaviorServiceMock.removePassiveItemEffect).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });
    });
});
