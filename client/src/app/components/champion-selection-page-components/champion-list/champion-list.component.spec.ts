import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Champion, CHAMPIONS } from '@app/constants/champions';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { LobbyGatewayEvents } from '@common/events/gateway-events';
import { Subject } from 'rxjs';
import { ChampionListComponent } from './champion-list.component';
interface ChampionEvent {
    index: number;
    playerId: string;
}
type ChampionEventHandler = (data: ChampionEvent) => void;
type SelectedChampionsEventHandler = (data: ChampionEvent[]) => void;
type EventHandler = ChampionEventHandler | SelectedChampionsEventHandler;

describe('ChampionListComponent', () => {
    let component: ChampionListComponent;
    let fixture: ComponentFixture<ChampionListComponent>;
    let mockChampionIndexService: jasmine.SpyObj<ChampionIndexService>;
    let mockLobbyService: jasmine.SpyObj<LobbyService>;
    let currentIndexSubject: Subject<number>;
    let eventHandlers: Record<string, EventHandler> = {};

    const mockChampions: Champion[] = CHAMPIONS;
    const FIRST_CHAMPION_INDEX = 0;
    const SELECTED_CHAMPION_INDEX = 1;
    const CURRENT_CHAMPION_INDEX = 2;
    const NEW_CHAMPION_INDEX = 3;
    const MOCK_CHAMPIONS_INDEX = [1, 2, NEW_CHAMPION_INDEX];

    beforeEach(async () => {
        currentIndexSubject = new Subject<number>();

        mockChampionIndexService = jasmine.createSpyObj('ChampionIndexService', ['setCurrentIndex', 'setDisabledChampions']);

        mockChampionIndexService.currentIndex$ = currentIndexSubject.asObservable();
        mockLobbyService = jasmine.createSpyObj('LobbyService', ['on', 'off', 'getSelectedChampions', 'championSelected']);
        mockLobbyService.on.and.callFake(<T>(event: string, callback: (data: T) => void) => {
            eventHandlers[event] = callback as unknown as EventHandler;
            return mockLobbyService;
        });

        await TestBed.configureTestingModule({
            imports: [ChampionListComponent],
            providers: [
                { provide: ChampionIndexService, useValue: mockChampionIndexService },
                { provide: LobbyService, useValue: mockLobbyService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(ChampionListComponent);
        component = fixture.componentInstance;
        component.champions = mockChampions;

        eventHandlers = {};

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnInit', () => {
        it('should subscribe to championIndexService', () => {
            component.ngOnInit();
            currentIndexSubject.next(CURRENT_CHAMPION_INDEX);
            expect(component.currentIndex).toBe(CURRENT_CHAMPION_INDEX);
        });

        it('should call getSelectedChampions method from lobbyService', () => {
            component.ngOnInit();
            expect(mockLobbyService.getSelectedChampions).toHaveBeenCalled();
        });

        it('should handle champion selection events and update disabled champions', () => {
            component.currentIndex = 2;
            component.ngOnInit();
            type ChampionSelectedHandler = (data: { championsIndex: number[] }) => void;
            const handler = eventHandlers[LobbyGatewayEvents.ChampionSelected] as unknown as ChampionSelectedHandler;
            handler({ championsIndex: MOCK_CHAMPIONS_INDEX });

            expect(component.selectedByOthers).toEqual([1, NEW_CHAMPION_INDEX]);
            expect(mockChampionIndexService.setDisabledChampions).toHaveBeenCalledWith([1, NEW_CHAMPION_INDEX]);
        });
    });

    describe('ngOnDestroy', () => {
        it('should unsubscribe from all subscriptions', () => {
            component.ngOnInit();
            spyOn(component['championIndexSubscription'], 'unsubscribe');

            component.ngOnDestroy();

            expect(component['championIndexSubscription'].unsubscribe).toHaveBeenCalled();
        });

        it('should remove all event listeners', () => {
            component.ngOnDestroy();

            expect(mockLobbyService.off).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected);
        });
    });

    describe('selectChampion', () => {
        it('should not select champion if it is already selected by others', () => {
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX];

            component.selectChampion(SELECTED_CHAMPION_INDEX);

            expect(mockChampionIndexService.setCurrentIndex).not.toHaveBeenCalled();
            expect(mockLobbyService.championSelected).not.toHaveBeenCalled();
        });

        it('should select champion and notify with only new index when currentIndex is null', () => {
            component.currentIndex = null;
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX];

            component.selectChampion(NEW_CHAMPION_INDEX);

            expect(mockChampionIndexService.setCurrentIndex).toHaveBeenCalledWith(NEW_CHAMPION_INDEX);
            expect(mockLobbyService.championSelected).toHaveBeenCalledWith(NEW_CHAMPION_INDEX);
        });

        it('should select champion and notify with both indices when currentIndex is not null', () => {
            component.currentIndex = CURRENT_CHAMPION_INDEX;
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX];

            component.selectChampion(NEW_CHAMPION_INDEX);

            expect(mockChampionIndexService.setCurrentIndex).toHaveBeenCalledWith(NEW_CHAMPION_INDEX);
            expect(mockLobbyService.championSelected).toHaveBeenCalledWith(NEW_CHAMPION_INDEX, CURRENT_CHAMPION_INDEX);
        });
    });

    describe('updateDisabledChampions', () => {
        it('should update disabled champions in the service', () => {
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX, NEW_CHAMPION_INDEX];
            component['updateDisabledChampions']();
            expect(mockChampionIndexService.setDisabledChampions).toHaveBeenCalledWith([SELECTED_CHAMPION_INDEX, NEW_CHAMPION_INDEX]);
        });
    });

    describe('isChampionDisabled', () => {
        it('should return true if champion is selected by others', () => {
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX, NEW_CHAMPION_INDEX];

            expect(component.isChampionDisabled(SELECTED_CHAMPION_INDEX)).toBeTrue();
            expect(component.isChampionDisabled(NEW_CHAMPION_INDEX)).toBeTrue();
        });

        it('should return false if champion is not selected by others', () => {
            component.selectedByOthers = [SELECTED_CHAMPION_INDEX, NEW_CHAMPION_INDEX];

            expect(component.isChampionDisabled(FIRST_CHAMPION_INDEX)).toBeFalse();
            expect(component.isChampionDisabled(CURRENT_CHAMPION_INDEX)).toBeFalse();
        });
    });
});
