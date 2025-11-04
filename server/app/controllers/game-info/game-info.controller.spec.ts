import { Test, TestingModule } from '@nestjs/testing';
import { GameInfoController } from '@app/controllers/game-info/game-info.controller';
import { createStubInstance, SinonStubbedInstance } from 'sinon';
import { GameInfoService } from '@app/services/game-info/game-info.service';
import { getFakeGameInfo } from '@app/fake-game-info';

describe('GameInfoController', () => {
    let controller: GameInfoController;
    let gameInfoService: SinonStubbedInstance<GameInfoService>;

    beforeEach(async () => {
        gameInfoService = createStubInstance(GameInfoService);
        const module: TestingModule = await Test.createTestingModule({
            controllers: [GameInfoController],
            providers: [
                {
                    provide: GameInfoService,
                    useValue: gameInfoService,
                },
            ],
        }).compile();

        controller = module.get<GameInfoController>(GameInfoController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('create() should call GameInfoService.create()', async () => {
        const fakeGameInfo = getFakeGameInfo();
        gameInfoService.create.resolves(fakeGameInfo);
        const gameInfo = await controller.create(fakeGameInfo);
        expect(gameInfo).toEqual(fakeGameInfo);
        expect(gameInfoService.create.calledOnce).toBeTruthy();
    });

    it('get() should call GameInfoService.find()', async () => {
        const fakeGameInfo = getFakeGameInfo();
        gameInfoService.find.resolves(fakeGameInfo);
        const gameInfo = await controller.find(fakeGameInfo._id);
        expect(gameInfo).toEqual(fakeGameInfo);
        expect(gameInfoService.find.calledOnce).toBeTruthy();
    });

    it('put() should call GameInfoService.update()', async () => {
        const fakeGameInfo = getFakeGameInfo();
        gameInfoService.update.resolves(fakeGameInfo);
        const gameInfo = await controller.update(fakeGameInfo._id, fakeGameInfo);
        expect(gameInfo).toEqual(fakeGameInfo);
        expect(gameInfoService.update.calledOnce).toBeTruthy();
    });

    it('delete() should call GameInfoService.delete()', async () => {
        const fakeGameInfo = getFakeGameInfo();
        gameInfoService.delete.resolves();
        await controller.delete(fakeGameInfo._id);
        expect(gameInfoService.delete.calledOnce).toBeTruthy();
    });

    it('findAll() should call GameInfoService.findAll()', async () => {
        const fakeGameInfo = getFakeGameInfo();
        gameInfoService.findAll.resolves([fakeGameInfo]);
        const gameInfo = await controller.findAll();
        expect(gameInfo).toEqual([fakeGameInfo]);
        expect(gameInfoService.findAll.calledOnce).toBeTruthy();
    });
});
