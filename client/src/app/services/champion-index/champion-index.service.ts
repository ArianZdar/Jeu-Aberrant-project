import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
@Injectable({
    providedIn: 'root',
})
export class ChampionIndexService {
    currentIndexSubject = new BehaviorSubject<number | null>(null);
    currentIndex$ = this.currentIndexSubject.asObservable();
    disabledChampionsSubject = new BehaviorSubject<number[]>([]);
    disabledChampions$ = this.disabledChampionsSubject.asObservable();

    constructor(private lobbyService: LobbyService) {}

    setCurrentIndex(index: number): void {
        this.currentIndexSubject.next(index);
    }

    quitChampionSelection(): void {
        if (this.currentIndexSubject.value !== null) {
            this.lobbyService.championSelected(-1, this.currentIndexSubject.value);
        }
    }

    resetIndex(): void {
        this.currentIndexSubject.next(null);
    }

    setDisabledChampions(indices: number[]): void {
        this.disabledChampionsSubject.next(indices);
    }
}
