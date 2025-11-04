import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { DeleteGameDialogComponent } from '@app/components/admin-page-components/delete-game-dialog/delete-game-dialog.component';
import { GameListComponent } from '@app/components/admin-page-components/game-list/game-list.component';
import { getFakeGameInfo } from '@app/constants/mocks';
import { GameService } from '@app/services/game/game.service';
import { of, throwError } from 'rxjs';

describe('GameListComponent', () => {
    let component: GameListComponent;
    let fixture: ComponentFixture<GameListComponent>;
    let gameServiceMock: jasmine.SpyObj<GameService>;
    let matDialogSpy: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        gameServiceMock = jasmine.createSpyObj('GameService', ['getGamesInfo', 'getGameById', 'updateGame', 'deleteGame']);
        gameServiceMock.getGamesInfo.and.returnValue(of([]));

        matDialogSpy = jasmine.createSpyObj('MatDialog', ['open']);
        matDialogSpy.open.and.returnValue({ afterClosed: () => of(true) } as MatDialogRef<unknown>);

        await TestBed.configureTestingModule({
            imports: [GameListComponent],
            providers: [provideHttpClient(), { provide: GameService, useValue: gameServiceMock }, { provide: MatDialog, useValue: matDialogSpy }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should sort games by date in descending order', () => {
        const oldGame = getFakeGameInfo();
        const newGame = getFakeGameInfo();

        oldGame.lastChange = new Date('2024-01-01T12:00:00.000Z');
        newGame.lastChange = new Date('2024-02-15T12:00:00.000Z');

        gameServiceMock.getGamesInfo.and.returnValue(of([newGame, oldGame]));

        component.fetchGames();

        expect(component.games[0]).toEqual(newGame);
        expect(component.games[1]).toEqual(oldGame);
    });

    it('Update() should update game', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.getGameById.and.returnValue(of(gameInfo));
        gameServiceMock.updateGame.and.returnValue(of(gameInfo));

        component.toggleIsHidden(gameInfo);

        expect(gameServiceMock.getGameById).toHaveBeenCalledWith(gameInfo._id);
        expect(gameServiceMock.updateGame).toHaveBeenCalledWith(gameInfo);
    });

    it('Delete() should delete game', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.deleteGame.and.returnValue(of(gameInfo));

        component.deleteGame(gameInfo);

        expect(gameServiceMock.deleteGame).toHaveBeenCalledWith(gameInfo);
    });

    it('Delete() should not delete games that are not found', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.deleteGame.and.returnValue(of(null));

        component.deleteGame(gameInfo);

        expect(gameServiceMock.deleteGame).toHaveBeenCalledWith(gameInfo);
    });

    it('delete() should delete game from the UI', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.deleteGame.and.returnValue(of(gameInfo));

        component.games = [gameInfo];
        component.deleteGame(gameInfo);

        expect(component.games).toEqual([]);
    });

    it('delete() should  delete game from the UI if it is not found', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.deleteGame.and.returnValue(of(null));

        component.games = [gameInfo];
        component.deleteGame(gameInfo);

        expect(component.games).toEqual([]);
    });

    it('toggleIsHidden() should update game UI', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.getGameById.and.returnValue(of(gameInfo));
        gameServiceMock.updateGame.and.returnValue(of(gameInfo));

        component.games = [gameInfo];
        component.toggleIsHidden(gameInfo);

        expect(component.games).toEqual([gameInfo]);
    });

    it('deleteGame() should delete game from the UI if it is found', () => {
        const gameInfo = getFakeGameInfo();
        gameServiceMock.deleteGame.and.returnValue(of(gameInfo));

        component.games = [gameInfo];
        component.deleteGame(gameInfo);

        expect(matDialogSpy.open).toHaveBeenCalledWith(DeleteGameDialogComponent);
        expect(gameServiceMock.deleteGame).toHaveBeenCalledWith(gameInfo);
    });

    it('toggleIsHidden() should update game UI when game is found and updated', () => {
        const gameInfo = getFakeGameInfo();
        const updatedGameInfo = { ...gameInfo, isHidden: !gameInfo.isHidden };
        gameServiceMock.getGameById.and.returnValue(of(gameInfo));
        gameServiceMock.updateGame.and.returnValue(of(updatedGameInfo));

        component.games = [gameInfo];
        component.toggleIsHidden(gameInfo);

        expect(gameServiceMock.getGameById).toHaveBeenCalledWith(gameInfo._id);
        expect(gameServiceMock.updateGame).toHaveBeenCalledWith(updatedGameInfo);
        expect(component.games).toEqual([updatedGameInfo]);
    });

    it('deleteGame() should handle error when game is not found', () => {
        const gameInfo = getFakeGameInfo();
        const error = { message: 'Game not found' };
        gameServiceMock.deleteGame.and.returnValue(throwError(() => error));
        spyOn(component['snackBarService'], 'showSnackBar');

        component.games = [gameInfo];
        component.deleteGame(gameInfo);

        expect(matDialogSpy.open).toHaveBeenCalledWith(DeleteGameDialogComponent);
        expect(component['snackBarService'].showSnackBar).toHaveBeenCalledWith('Le jeu a été supprimé.');
        expect(component.games).toEqual([]);
    });

    it('toggleIsHidden() should call deleteGame when getGameById fails', () => {
        const gameInfo = getFakeGameInfo();
        const error = new Error('Failed to fetch game');
        gameServiceMock.getGameById.and.returnValue(throwError(() => error));
        spyOn(component, 'deleteGame');

        component.games = [gameInfo];
        component.toggleIsHidden(gameInfo);

        expect(gameServiceMock.getGameById).toHaveBeenCalledWith(gameInfo._id);
        expect(component.deleteGame).toHaveBeenCalledWith(gameInfo);
    });
});
