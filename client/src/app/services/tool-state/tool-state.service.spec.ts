import { TestBed } from '@angular/core/testing';
import { ToolStateService } from './tool-state.service';
import { ITEM_TIMEOUT } from '@app/constants/client-constants';
import { GameObjects } from '@common/game/game-enums';

describe('ToolStateService', () => {
    let service: ToolStateService;
    const TEST_BUFFER = 100;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ToolStateService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    describe('Active Tool Management', () => {
        it('should set and get active tool', () => {
            service.setActiveTool('grass');
            expect(service.getActiveTool()).toEqual('grass');

            service.setActiveTool('wall');
            expect(service.getActiveTool()).toEqual('wall');
        });

        it('should return null when no active tool is set', () => {
            expect(service.getActiveTool()).toBeNull();
        });
    });

    describe('Item Placement Management', () => {
        it('should set item being placed', () => {
            service.placeItem(GameObjects.Armor);
            expect(service.getItemBeingPlaced()).toBe(GameObjects.Armor);
        });

        it('should clear item being placed when placedItem is called', () => {
            service.placeItem(GameObjects.Shield);
            expect(service.getItemBeingPlaced()).toBe(GameObjects.Shield);

            service.placedItem();
            expect(service.getItemBeingPlaced()).toBe(GameObjects.None);
        });

        it('should automatically clear item being placed after timeout', (done) => {
            service.placeItem(GameObjects.Bomb);
            expect(service.getItemBeingPlaced()).toBe(GameObjects.Bomb);

            setTimeout(() => {
                expect(service.getItemBeingPlaced()).toBe(GameObjects.None);
                done();
            }, ITEM_TIMEOUT + TEST_BUFFER);
        });

        it('should not set a timeout if item is None', () => {
            const spy = spyOn(window, 'setTimeout').and.callThrough();
            service.placeItem(GameObjects.None);
            expect(spy).not.toHaveBeenCalled();
        });

        it('should clear existing timeout when placing a new item', () => {
            const clearSpy = spyOn(window, 'clearTimeout').and.callThrough();
            const setSpy = spyOn(window, 'setTimeout').and.callThrough();

            service.placeItem(GameObjects.Bomb);
            expect(clearSpy).not.toHaveBeenCalled();
            expect(setSpy).toHaveBeenCalledTimes(1);

            clearSpy.calls.reset();
            setSpy.calls.reset();

            service.placeItem(GameObjects.Shield);
            expect(clearSpy).toHaveBeenCalledTimes(1);
            expect(setSpy).toHaveBeenCalledTimes(1);
        });
    });

    describe('Drag State Management', () => {
        it('should set and get currently dragging state', () => {
            service.setCurrentlyDragging(true);
            expect(service.getCurrentlyDragging()).toBeTrue();

            service.setCurrentlyDragging(false);
            expect(service.getCurrentlyDragging()).toBeFalse();
        });

        it('should initialize currentlyDragging to false', () => {
            expect(service.getCurrentlyDragging()).toBeFalse();
        });
    });

    afterEach(() => {
        jasmine.clock().uninstall();
    });
});
