import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { getFakeGameInfo } from '@app/constants/mocks';
import { GameService } from '@app/services/game/game.service';
import { of } from 'rxjs';
import { GameStatusValidationService } from './game-status-validation.service';

describe('GameStatusValidationService', () => {
    let service: GameStatusValidationService;
    let mockRouter: jasmine.SpyObj<Router>;
    let mockGameService: jasmine.SpyObj<GameService>;
    let mockSnackBar: jasmine.SpyObj<MatSnackBar>;

    beforeEach(() => {
        mockRouter = jasmine.createSpyObj('Router', ['navigate']);
        mockGameService = jasmine.createSpyObj('GameService', ['getGameById']);
        mockSnackBar = jasmine.createSpyObj('MatSnackBar', ['open']);

        TestBed.configureTestingModule({
            providers: [
                GameStatusValidationService,
                { provide: Router, useValue: mockRouter },
                { provide: GameService, useValue: mockGameService },
                { provide: MatSnackBar, useValue: mockSnackBar },
            ],
        });

        service = TestBed.inject(GameStatusValidationService);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should show snack bar message if game is hidden', () => {
        const fakeGame = getFakeGameInfo();
        fakeGame.isHidden = true;
        mockGameService.getGameById.and.returnValue(of(fakeGame));
        service.validation('gameId', 'somePage');
        expect(mockSnackBar.open).toHaveBeenCalledWith(
            "La visibilité du jeu a été changée, ce dernier n'est plus accessible.",
            'Fermer',
            Object({ duration: 5000, panelClass: ['custom-snackbar'] }),
        );
    });

    it('should navigate to /champ-select if actual page is gameCreation', () => {
        const fakeGame = getFakeGameInfo();
        fakeGame.isHidden = false;
        mockGameService.getGameById.and.returnValue(of(fakeGame));
        service.validation('gameId', 'gameCreation');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/champ-select']);
    });

    it('should navigate to /lobby if actual page is champSelect', () => {
        const fakeGame = getFakeGameInfo();
        fakeGame.isHidden = false;
        mockGameService.getGameById.and.returnValue(of(fakeGame));
        service.validation('gameId', 'champSelect');
        expect(mockRouter.navigate).toHaveBeenCalledWith(['/lobby']);
    });
});
