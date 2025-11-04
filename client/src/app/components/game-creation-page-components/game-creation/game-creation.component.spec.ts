import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { getFakeGameInfo } from '@app/constants/mocks';
import { GameService } from '@app/services/game/game.service';
import { GameInfo } from '@common/game/game-info';
import { of } from 'rxjs';
import { GameCreationComponent } from './game-creation.component';

describe('GameCreationComponent', () => {
    let component: GameCreationComponent;
    let fixture: ComponentFixture<GameCreationComponent>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(async () => {
        mockGameService = jasmine.createSpyObj('GameService', ['getGameById']);
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

        await TestBed.configureTestingModule({
            imports: [GameCreationComponent],
            providers: [
                { provide: GameService, useValue: mockGameService },
                { provide: Router, useValue: mockRouter },
                { provide: MatSnackBar, useValue: mockSnackBar },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCreationComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('toggleDescription() should toggle isDescriptionExpanded', () => {
        expect(component.isDescriptionExpanded).toBe(false);
        component.toggleDescription();
        expect(component.isDescriptionExpanded).toBe(true);
        component.toggleDescription();
        expect(component.isDescriptionExpanded).toBe(false);
    });

    describe('valid()', () => {
        it('should show snackbar if game does not exist', () => {
            mockGameService.getGameById.and.returnValue(of(null as unknown as GameInfo));

            component.valid();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                'Le jeu à été supprimé.',
                'Fermer',
                Object({ duration: 5000, panelClass: ['custom-snackbar'] }),
            );
        });

        it('should show snackbar if game is hidden', () => {
            const hiddenGame: GameInfo = { ...getFakeGameInfo(), isHidden: true };
            mockGameService.getGameById.and.returnValue(of(hiddenGame));

            component.valid();

            expect(mockSnackBar.open).toHaveBeenCalledWith(
                "La visibilité du jeu a été changée, ce dernier n'est plus accessible.",
                'Fermer',
                Object({ duration: 5000, panelClass: ['custom-snackbar'] }),
            );
        });

        it('should navigate if game exists and is not hidden', () => {
            const visibleGame: GameInfo = { ...getFakeGameInfo(), isHidden: false };
            mockGameService.getGameById.and.returnValue(of(visibleGame));

            component.valid();

            expect(mockRouter.navigate).toHaveBeenCalledWith(['/champ-select']);
        });
    });
});
