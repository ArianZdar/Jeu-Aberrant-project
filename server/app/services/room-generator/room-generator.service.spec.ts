import { MAX_ROOMS } from '@app/constants/server-constants';
import { Test, TestingModule } from '@nestjs/testing';
import * as sinon from 'sinon';
import { RoomGeneratorService } from './room-generator.service';

describe('RoomGeneratorService', () => {
    const FIRST_RANDOM_VALUE = 0.123;
    const SECOND_RANDOM_VALUE = 0.456;
    const EXPECTED_RANDOM_CALLS = 3;
    const REMOVE_TEST_RANDOM_VALUE = 0.5;
    let service: RoomGeneratorService;
    let randomStub: sinon.SinonStub;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [RoomGeneratorService],
        }).compile();

        service = module.get<RoomGeneratorService>(RoomGeneratorService);
        randomStub = sinon.stub(Math, 'random');
    });

    afterEach(() => {
        sinon.restore();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateRoom', () => {
        it('should not generate a room ID that is already in use', () => {
            randomStub.onFirstCall().returns(FIRST_RANDOM_VALUE);
            randomStub.onSecondCall().returns(FIRST_RANDOM_VALUE);
            randomStub.onThirdCall().returns(SECOND_RANDOM_VALUE);
            const roomId1 = service.generateRoom();
            const roomId2 = service.generateRoom();
            expect(roomId1).not.toEqual(roomId2);
            expect(randomStub.callCount).toEqual(EXPECTED_RANDOM_CALLS);
        });

        it('should throw an error when MAX_ROOMS limit is reached', () => {
            const spy = jest.spyOn(service['usedRooms'], 'size', 'get').mockReturnValue(MAX_ROOMS);
            try {
                service.generateRoom();
                fail('Expected generateRoom to throw an error but it did not');
            } catch (error) {
                expect(error.message).toBe('No available rooms left');
            } finally {
                spy.mockRestore();
            }
        });
    });

    describe('removeRoom', () => {
        it('should remove a room from the set of used rooms', () => {
            function getUsedRooms(newService: RoomGeneratorService): Set<string> {
                return newService['usedRooms'];
            }

            randomStub.returns(REMOVE_TEST_RANDOM_VALUE);
            const roomId = service.generateRoom();

            expect(getUsedRooms(service).has(roomId)).toBe(true);

            service.removeRoom(roomId);

            expect(getUsedRooms(service).has(roomId)).toBe(false);
        });
    });
});
