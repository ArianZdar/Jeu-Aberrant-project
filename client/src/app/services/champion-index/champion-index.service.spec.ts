import { TestBed } from '@angular/core/testing';
import { ChampionIndexService } from './champion-index.service';

describe('ChampionIndexService', () => {
    let service: ChampionIndexService;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(ChampionIndexService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should set and get the current index', () => {
        service.setCurrentIndex(1);
        service.currentIndex$.subscribe((index) => {
            expect(index).toBe(1);
        });
    });

    it('resetIndex() should set the index to null', () => {
        service.resetIndex();
        service.currentIndex$.subscribe((index) => {
            expect(index).toBe(null);
        });
    });

    it('should set and get the disabled champions', () => {
        service.setDisabledChampions([1, 2]);
        service.disabledChampions$.subscribe((indices) => {
            expect(indices).toEqual([1, 2]);
        });
    });

    it('quitChampionSelection() should call lobbyService.championSelected when index is not null', () => {
        const mockIndex = 5;
        const lobbySpy = spyOn(service['lobbyService'], 'championSelected');
        service.setCurrentIndex(mockIndex);

        service.quitChampionSelection();

        expect(lobbySpy).toHaveBeenCalledWith(-1, mockIndex);
    });

    it('quitChampionSelection() should not call lobbyService.championSelected when index is null', () => {
        service.resetIndex();
        const lobbySpy = spyOn(service['lobbyService'], 'championSelected');

        service.quitChampionSelection();

        expect(lobbySpy).not.toHaveBeenCalled();
    });
});
