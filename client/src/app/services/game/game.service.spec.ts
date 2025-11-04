import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { getFakeGameInfo } from '@app/constants/mocks';
import { GameService } from './game.service';

describe('GameService', () => {
    let service: GameService;
    let httpMock: HttpTestingController;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), GameService],
        });
        service = TestBed.inject(GameService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('getGamesInfo() should handle error', () => {
        service.getGamesInfo().subscribe({
            next: () => fail('expected an error, not games info'),
            error: (error) => expect(error.message).toContain('Failed to get games info:'),
        });

        const req = httpMock.expectOne(`${service['baseUrl']}/game-info`);
        expect(req.request.method).toBe('GET');
        req.flush('404 Not Found', { status: 404, statusText: 'Not Found' });
    });

    describe('getGameById()', () => {
        it('should handle 404 error', () => {
            const mockGameInfo = getFakeGameInfo();

            service.getGameById(mockGameInfo._id).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Game with ID'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('GET');
            req.flush('404 Not Found', { status: 404, statusText: 'Not Found' });
        });

        it('should handle other errors', () => {
            const mockGameInfo = getFakeGameInfo();
            service.getGameById(mockGameInfo._id).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Failed to get game by ID:'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('GET');
            req.flush('500 Internal Server Error', { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('updateGame()', () => {
        it('should update a game', () => {
            const mockGameInfo = getFakeGameInfo();

            service.updateGame(mockGameInfo).subscribe((gameInfo) => {
                expect(gameInfo).toEqual(mockGameInfo);
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('PUT');
            req.flush(mockGameInfo);
        });

        it('should handle error', () => {
            const mockGameInfo = getFakeGameInfo();

            service.updateGame(mockGameInfo).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Failed to update game:'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('PUT');
            req.flush({ errors: ['Failed to update game: Validation failed'] }, { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('deleteGame()', () => {
        it('should handle 404 error', () => {
            const mockGameInfo = getFakeGameInfo();

            service.deleteGame(mockGameInfo).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Game with ID'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('DELETE');
            req.flush('404 Not Found', { status: 404, statusText: 'Not Found' });
        });

        it('should handle other errors', () => {
            const mockGameInfo = getFakeGameInfo();

            service.deleteGame(mockGameInfo).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Failed to delete game:'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info/${mockGameInfo._id}`);
            expect(req.request.method).toBe('DELETE');
            req.flush({ errors: ['Failed to delete game: Permission denied'] }, { status: 500, statusText: 'Internal Server Error' });
        });
    });

    describe('createGame()', () => {
        it('should create a game', () => {
            const mockGameInfo = getFakeGameInfo();

            service.createGame(mockGameInfo).subscribe((gameInfo) => {
                expect(gameInfo).toEqual(mockGameInfo);
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info`);
            expect(req.request.method).toBe('POST');
            req.flush(mockGameInfo);
        });

        it('should handle error', () => {
            const mockGameInfo = getFakeGameInfo();

            service.createGame(mockGameInfo).subscribe({
                next: () => fail('expected an error, not game info'),
                error: (error) => expect(error.message).toContain('Failed to create game:'),
            });

            const req = httpMock.expectOne(`${service['baseUrl']}/game-info`);
            expect(req.request.method).toBe('POST');
            req.flush({ errors: ['Failed to create game: Something went wrong'] }, { status: 500, statusText: 'Internal Server Error' });
        });
    });
});
