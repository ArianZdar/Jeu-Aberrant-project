import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { GameCreationListComponent } from '@app/components/game-creation-page-components/game-creation-list/game-creation-list.component';
import { GameService } from '@app/services/game/game.service';
import { of } from 'rxjs';
import { GameCreationPageComponent } from './game-creation-page.component';

describe('GameCreationPageComponent', () => {
    let component: GameCreationPageComponent;
    let fixture: ComponentFixture<GameCreationPageComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['getGamesInfo']);
        mockGameService.getGamesInfo.and.returnValue(of([]));

        await TestBed.configureTestingModule({
            imports: [GameCreationPageComponent, GameCreationListComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCreationPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
