import { mockGameItem } from '@app/constants/server-mocks';
import { getFakeGameInfo } from '@app/fake-game-info';
import { Tile } from '@app/model/schema/game-grid.schema';
import { GameInfo, GameInfoDocument, gameSchema } from '@app/model/schema/game-info.schema';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { NotFoundException } from '@nestjs/common';
import { getConnectionToken, getModelToken, MongooseModule } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, Model, Types } from 'mongoose';
import { GameInfoService } from './game-info.service';

describe('GameInfoServiceEndToEnd', () => {
    let service: GameInfoService;
    let gameModel: Model<GameInfoDocument>;
    let mongoServer: MongoMemoryServer;
    let connection: Connection;

    const MAX_DESCRIPTION_LENGTH = 501;

    const transposeGrid = (grid: Tile[][]) => grid[0].map((_, colIndex) => grid.map((row) => row[colIndex]));

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const module = await Test.createTestingModule({
            imports: [
                MongooseModule.forRootAsync({
                    useFactory: () => ({ uri: mongoServer.getUri() }),
                }),
                MongooseModule.forFeature([{ name: GameInfo.name, schema: gameSchema }]),
            ],
            providers: [GameInfoService],
        }).compile();

        service = module.get<GameInfoService>(GameInfoService);
        gameModel = module.get<Model<GameInfoDocument>>(getModelToken(GameInfo.name));
        connection = await module.get(getConnectionToken());
    });

    afterEach(async () => {
        await gameModel.deleteMany({});
    });

    afterAll(async () => {
        await connection.close();
        await mongoServer.stop({ doCleanup: true });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
        expect(gameModel).toBeDefined();
    });

    describe('findAll()', () => {
        it('should return all game infos in database', async () => {
            const gameInfo = getFakeGameInfo();
            await gameModel.create(gameInfo);
            const result = await service.findAll();
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('find()', () => {
        it('should return game info with specified id', async () => {
            const gameInfo = getFakeGameInfo();
            const createdGameInfo = await gameModel.create(gameInfo);
            const result = await service.find(createdGameInfo._id.toString());
            expect(result).toMatchObject({ _id: createdGameInfo._id });
        });

        it('should throw not found error if game is missing', async () => {
            const missingGameInfo = getFakeGameInfo();
            await expect(service.find(missingGameInfo._id)).rejects.toThrow(NotFoundException);
        });
    });

    describe('create()', () => {
        it('should create when given valid classic game info', async () => {
            const gameInfo = getFakeGameInfo();

            const result = await service.create(gameInfo);
            expect(result).toBeDefined();
        });

        it('should create when given valid ctf game info', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameMode = GameModes.CTF;
            gameInfo.items.push({ position: { x: 2, y: 2 }, item: GameObjects.Flag });

            const result = await service.create(gameInfo);
            expect(result).toBeDefined();
        });

        it('should throw error when creating invalid ctf game', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameMode = GameModes.CTF;
            gameInfo.items = [];

            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should handle undefined items in a ctf game', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameMode = GameModes.CTF;
            gameInfo.items = undefined;

            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should throw error when creating a game with the same name', async () => {
            const gameInfo = getFakeGameInfo();

            await service.create(gameInfo);
            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should reject game grid with invalid door placement when surrounding tiles are invalid', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameGrid.tiles[1][0].tileType = 'terrain';
            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should reject game grid with door on the edge', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameGrid.tiles[0][0].tileType = 'door';
            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should reject game grid without valid description', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.description = '';
            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should reject game grid without terrain', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameGrid.tiles.forEach((row) =>
                row.forEach((tile) => {
                    if (['terrain', 'door'].includes(tile.tileType)) tile.tileType = 'wall';
                }),
            );
            await expect(service.create(gameInfo)).rejects.toThrow();
        });

        it('should reject invalid game grid', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameGrid.tiles[0][1].isSpawnPoint = true;
            gameInfo.gameGrid.tiles[0][1].tileType = 'wall';
            gameInfo.gameGrid.tiles[2].forEach((tile) => {
                tile.tileType = 'wall';
            });

            await expect(service.create(gameInfo)).rejects.toThrow();
        });
    });

    describe('update()', () => {
        it('should update game info with specified id', async () => {
            const gameInfo = getFakeGameInfo();
            const createdGameInfo = await gameModel.create(gameInfo);

            const updatedGameInfo = {
                name: 'Updated Game Name',
                description: 'Updated Game Description',
                gameMode: GameModes.Classic,
                gameGrid: {
                    tiles: transposeGrid(gameInfo.gameGrid.tiles),
                    size: gameInfo.gameGrid.size,
                },
                isHidden: true,
                items: [mockGameItem, mockGameItem],
            };

            const result = await service.update(createdGameInfo._id.toString(), updatedGameInfo);
            expect(result).toBeDefined();
            expect(result).toMatchObject(updatedGameInfo);
        });

        it('should throw error when updating a game with the same name', async () => {
            const gameInfo = getFakeGameInfo();
            const gameInfo2 = getFakeGameInfo();
            await gameModel.create(gameInfo2);
            await expect(service.update(gameInfo._id, gameInfo2)).rejects.toThrow();
        });

        it('should reject invalid game grid', async () => {
            const gameInfo = getFakeGameInfo();
            gameInfo.gameGrid.tiles[1][0].tileType = 'terrain';
            await expect(service.update(gameInfo._id, gameInfo)).rejects.toThrow();
        });

        it('should reject empty description', async () => {
            const gameInfo = getFakeGameInfo();
            const updatedGameInfo = { description: '' };
            await expect(service.update(gameInfo._id, updatedGameInfo)).rejects.toThrow();
        });

        it('should reject too long description', async () => {
            const gameInfo = getFakeGameInfo();
            const updatedGameInfo = { description: 'a'.repeat(MAX_DESCRIPTION_LENGTH) };
            await expect(service.update(gameInfo._id, updatedGameInfo)).rejects.toThrow();
        });
    });

    describe('delete()', () => {
        it('should delete game info with specified id', async () => {
            const gameInfo = getFakeGameInfo();
            const createdGameInfo = await gameModel.create(gameInfo);
            await service.delete(createdGameInfo._id.toString());
            const result = await gameModel.findById(createdGameInfo._id).exec();
            expect(result).toBeNull();
        });

        it('should throw error when deleting a non-existent game', async () => {
            const validId = new Types.ObjectId().toHexString();
            await expect(service.delete(validId)).rejects.toThrow();
        });
    });
});
