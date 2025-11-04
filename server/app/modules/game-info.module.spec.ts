import { Test, TestingModule } from '@nestjs/testing';
import { MongooseModule } from '@nestjs/mongoose';
import { GameInfoModule } from './game-info.module';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { GameInfoController } from '@app/controllers/game-info/game-info.controller';
import { GameInfo, gameSchema } from '@app/model/schema/game-info.schema';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Connection, connect } from 'mongoose';

describe('GameInfoModule', () => {
    let module: TestingModule;
    let mongoServer: MongoMemoryServer;
    let connection: Connection;

    beforeAll(async () => {
        mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        connection = (await connect(uri)).connection;

        module = await Test.createTestingModule({
            imports: [MongooseModule.forRoot(uri), MongooseModule.forFeature([{ name: GameInfo.name, schema: gameSchema }]), GameInfoModule],
        }).compile();
    });

    afterAll(async () => {
        await connection.dropDatabase();
        await connection.close();
        await mongoServer.stop();
        await module.close();
    });

    it('should be defined', () => {
        const gameInfoModule = module.get<GameInfoModule>(GameInfoModule);
        expect(gameInfoModule).toBeDefined();
    });

    it('GameInfoService should be defined', () => {
        const gameInfoService = module.get<GameInfoService>(GameInfoService);
        expect(gameInfoService).toBeDefined();
    });

    it('GameInfoController should be defined', () => {
        const gameInfoController = module.get<GameInfoController>(GameInfoController);
        expect(gameInfoController).toBeDefined();
    });
});
