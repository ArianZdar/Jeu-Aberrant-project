import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { GameInfo, GameInfoNoId } from '@common/game/game-info';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

const NOT_FOUND = 404;

@Injectable({
    providedIn: 'root',
})
export class GameService {
    private readonly baseUrl: string = environment.serverUrl;

    constructor(private readonly http: HttpClient) {}

    getGamesInfo(): Observable<GameInfo[]> {
        return this.http.get<GameInfo[]>(`${this.baseUrl}/game-info`).pipe(
            catchError((error) => {
                return throwError(() => new Error(`Failed to get games info: ${error.message}`));
            }),
        );
    }

    getGameById(id: string): Observable<GameInfo> {
        return this.http
            .get<GameInfo>(`${this.baseUrl}/game-info/${id}`)
            .pipe(
                catchError((error) =>
                    error.status === NOT_FOUND
                        ? throwError(() => new Error(`Game with ID ${id} not found.`))
                        : throwError(() => new Error(`Failed to get game by ID: ${error.message}`)),
                ),
            );
    }

    updateGame(game: GameInfo): Observable<GameInfo> {
        return this.http.put<GameInfo>(`${this.baseUrl}/game-info/${game._id}`, game).pipe(
            catchError((error) => {
                return throwError(() => new Error(error.error.errors.join('\n')));
            }),
        );
    }

    deleteGame(game: GameInfo): Observable<GameInfo | null> {
        return this.http
            .delete<GameInfo>(`${this.baseUrl}/game-info/${game._id}`)
            .pipe(
                catchError((error) =>
                    error.status === NOT_FOUND
                        ? throwError(() => new Error(`Game with ID ${game._id} not found.`))
                        : throwError(() => new Error(`Failed to delete game: ${error.message}`)),
                ),
            );
    }

    createGame(game: GameInfoNoId): Observable<GameInfoNoId> {
        return this.http.post<GameInfoNoId>(`${this.baseUrl}/game-info`, game).pipe(
            catchError((error) => {
                return throwError(() => new Error(error.error.errors.join('\n')));
            }),
        );
    }
}
