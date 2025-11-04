import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { getFakeGameInfo } from '@app/constants/mocks';
import { GameService } from '@app/services/game/game.service';
import { GameInfo } from '@common/game/game-info';
import { of } from 'rxjs';
import { GameCreationListComponent } from './game-creation-list.component';

describe('GameCreationListComponent', () => {
    let component: GameCreationListComponent;
    let fixture: ComponentFixture<GameCreationListComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['getGamesInfo']);
        mockGameService.getGamesInfo.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [GameCreationListComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCreationListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('fetchGames() should add only games that have isHidden set to false', () => {
        const mockGames: GameInfo[] = [
            { ...getFakeGameInfo(), isHidden: false },
            { ...getFakeGameInfo(), isHidden: true },
            { ...getFakeGameInfo(), isHidden: false },
        ];
        mockGameService.getGamesInfo.and.returnValue(of(mockGames));

        component.fetchGames();

        expect(component.games).toEqual([{ ...mockGames[0] }, { ...mockGames[2] }]);
        expect(component.loading).toBe(false);
    });
});
