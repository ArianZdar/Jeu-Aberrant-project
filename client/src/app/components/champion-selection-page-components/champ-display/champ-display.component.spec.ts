import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChampDisplayComponent } from './champ-display.component';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { Champion } from '@app/constants/champions';
import { BehaviorSubject, Subscription } from 'rxjs';

interface ChampDisplayComponentPrivateProps {
    championIndexSubscription: Subscription | { unsubscribe: () => void };
    disabledChampionsSubscription: Subscription | { unsubscribe: () => void };
}

describe('ChampDisplayComponent', () => {
    let component: ChampDisplayComponent;
    let fixture: ComponentFixture<ChampDisplayComponent>;
    let mockChampionIndexService: jasmine.SpyObj<ChampionIndexService>;
    let currentIndexSubject: BehaviorSubject<number | null>;
    let disabledChampionsSubject: BehaviorSubject<number[]>;

    const mockChampions: Champion[] = [
        {
            name: 'Champion 1',
            description: 'Description of Champion 1',
            imageUrl: 'assets/champions/beast.png',
        },
        {
            name: 'Champion 2',
            description: 'Description of Champion 2',
            imageUrl: 'assets/champions/ghost.png',
        },
        {
            name: 'Champion 3',
            description: 'Description of Champion 3',
            imageUrl: 'assets/champions/blood-knight.png',
        },
    ];

    beforeEach(async () => {
        currentIndexSubject = new BehaviorSubject<number | null>(0);
        disabledChampionsSubject = new BehaviorSubject<number[]>([]);

        mockChampionIndexService = jasmine.createSpyObj('ChampionIndexService', ['setCurrentIndex']);

        Object.defineProperty(mockChampionIndexService, 'currentIndex$', {
            get: () => currentIndexSubject.asObservable(),
        });
        Object.defineProperty(mockChampionIndexService, 'disabledChampions$', {
            get: () => disabledChampionsSubject.asObservable(),
        });

        await TestBed.configureTestingModule({
            imports: [ChampDisplayComponent],
            providers: [{ provide: ChampionIndexService, useValue: mockChampionIndexService }],
        }).compileComponents();

        fixture = TestBed.createComponent(ChampDisplayComponent);
        component = fixture.componentInstance;
        component.champions = mockChampions;

        (component as unknown as ChampDisplayComponentPrivateProps).championIndexSubscription = new Subscription();
        (component as unknown as ChampDisplayComponentPrivateProps).disabledChampionsSubscription = new Subscription();
    });

    afterEach(() => {
        if ((component as unknown as ChampDisplayComponentPrivateProps).championIndexSubscription) {
            (component as unknown as ChampDisplayComponentPrivateProps).championIndexSubscription.unsubscribe();
        }
        if ((component as unknown as ChampDisplayComponentPrivateProps).disabledChampionsSubscription) {
            (component as unknown as ChampDisplayComponentPrivateProps).disabledChampionsSubscription.unsubscribe();
        }
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize currentChampionIndex from ChampionIndexService', fakeAsync(() => {
        component.ngOnInit();
        tick();
        expect(component.getCurrentChampionIndex).toBe(0);
    }));

    it('should update currentChampionIndex when ChampionIndexService emits a new index', fakeAsync(() => {
        component.ngOnInit();
        currentIndexSubject.next(1);
        tick();
        expect(component.getCurrentChampionIndex).toBe(1);
    }));

    it('should update disabledChampions when ChampionIndexService emits new disabled champions', fakeAsync(() => {
        component.ngOnInit();
        disabledChampionsSubject.next([1]);
        tick();
        expect(component.disabledChampions).toEqual([1]);
    }));

    it('should return the current champion', () => {
        component.setCurrentChampionIndex = 0;
        expect(component.currentChampion).toEqual(mockChampions[0]);
    });

    it('should return undefined if currentChampionIndex is undefined', () => {
        component.setCurrentChampionIndex = undefined;
        expect(component.currentChampion).toBeUndefined();
    });

    it('should check if a champion is disabled', () => {
        component.disabledChampions = [1];
        expect(component.isChampionDisabled(1)).toBeTrue();
        expect(component.isChampionDisabled(0)).toBeFalse();
    });

    it('should show the next champion when ArrowRight key is pressed', () => {
        component.setCurrentChampionIndex = 0;
        spyOn(component, 'showNextChampion').and.callThrough();

        const event = new KeyboardEvent('keydown', { key: 'ArrowRight' });
        component.buttonDetect(event);

        expect(component.showNextChampion).toHaveBeenCalled();
        expect(mockChampionIndexService.setCurrentIndex).toHaveBeenCalledWith(1);
    });

    it('should show the previous champion when ArrowLeft key is pressed', () => {
        component.setCurrentChampionIndex = 1;
        spyOn(component, 'showPreviousChampion').and.callThrough();

        const event = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
        component.buttonDetect(event);

        expect(component.showPreviousChampion).toHaveBeenCalled();
        expect(mockChampionIndexService.setCurrentIndex).toHaveBeenCalledWith(0);
    });

    it('should not change champion if all champions are disabled', () => {
        component.setCurrentChampionIndex = 0;
        component.disabledChampions = [1, 2];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showNextChampion();

        expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
    });

    it('should unsubscribe from subscriptions on ngOnDestroy', () => {
        const indexUnsubscribe = jasmine.createSpy('indexUnsubscribe');
        const disabledUnsubscribe = jasmine.createSpy('disabledUnsubscribe');

        (component as unknown as ChampDisplayComponentPrivateProps).championIndexSubscription = { unsubscribe: indexUnsubscribe };
        (component as unknown as ChampDisplayComponentPrivateProps).disabledChampionsSubscription = { unsubscribe: disabledUnsubscribe };

        component.ngOnDestroy();

        expect(indexUnsubscribe).toHaveBeenCalled();
        expect(disabledUnsubscribe).toHaveBeenCalled();
    });

    it('should not change champion in showPreviousChampion if all other champions are disabled', () => {
        component.setCurrentChampionIndex = 0;
        component.disabledChampions = [1, 2];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showPreviousChampion();

        expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
    });

    it('should not call setCurrentIndex in showNextChampion when champions array is empty', () => {
        component.champions = [];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showNextChampion();

        expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
    });

    it('should not call setCurrentIndex in showPreviousChampion when champions array is empty', () => {
        component.champions = [];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showPreviousChampion();

        expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
    });

    it('should handle undefined currentChampionIndex in showNextChampion', () => {
        component.setCurrentChampionIndex = undefined;
        component.disabledChampions = [];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showNextChampion();

        expect(mockChampionIndexService.setCurrentIndex).toHaveBeenCalledWith(0);
    });

    it('should handle undefined currentChampionIndex in showPreviousChampion', () => {
        component.setCurrentChampionIndex = undefined;
        component.disabledChampions = [1, 2];
        mockChampionIndexService.setCurrentIndex.calls.reset();

        component.showPreviousChampion();

        expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
    });

    it('should set currentChampionIndex to undefined when ChampionIndexService emits null', fakeAsync(() => {
        component.setCurrentChampionIndex = 1;

        component.ngOnInit();

        currentIndexSubject.next(null);
        tick();

        expect(component.getCurrentChampionIndex).toBeUndefined();
    }));
});
