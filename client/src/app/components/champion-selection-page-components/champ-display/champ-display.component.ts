import { Component, Input, OnDestroy, OnInit, HostListener } from '@angular/core';
import { Champion } from '@app/constants/champions';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { Subscription } from 'rxjs';

@Component({
    selector: 'app-champ-display',
    templateUrl: './champ-display.component.html',
    styleUrls: ['./champ-display.component.scss'],
})
export class ChampDisplayComponent implements OnInit, OnDestroy {
    @Input() champions!: Champion[];

    disabledChampions: number[] = [];
    private currentChampionIndex: number | undefined = undefined;

    private championIndexSubscription!: Subscription;
    private disabledChampionsSubscription!: Subscription;

    constructor(private championService: ChampionIndexService) {}

    get currentChampion(): Champion | undefined {
        return this.currentChampionIndex !== undefined ? this.champions[this.currentChampionIndex] : undefined;
    }

    get getCurrentChampionIndex(): number | undefined {
        return this.currentChampionIndex;
    }

    set setCurrentChampionIndex(value: number | undefined) {
        this.currentChampionIndex = value;
    }

    @HostListener('window:keydown', ['$event'])
    buttonDetect(event: KeyboardEvent): void {
        if (event.key === 'ArrowLeft') {
            this.showPreviousChampion();
        } else if (event.key === 'ArrowRight') {
            this.showNextChampion();
        }
    }

    isChampionDisabled(index: number): boolean {
        return this.disabledChampions.includes(index);
    }
    ngOnDestroy(): void {
        this.championIndexSubscription.unsubscribe();
        this.disabledChampionsSubscription.unsubscribe();
    }

    ngOnInit(): void {
        this.championIndexSubscription = this.championService.currentIndex$.subscribe((index) => {
            this.currentChampionIndex = index !== null ? index : undefined;
        });

        this.disabledChampionsSubscription = this.championService.disabledChampions$.subscribe((disabled) => {
            this.disabledChampions = disabled;
        });
    }

    showNextChampion(): void {
        if (this.champions.length === 0) return;

        let nextIndex = this.currentChampionIndex !== undefined ? (this.currentChampionIndex + 1) % this.champions.length : 0;

        while (this.isChampionDisabled(nextIndex)) {
            nextIndex = (nextIndex + 1) % this.champions.length;

            if (nextIndex === (this.currentChampionIndex || 0)) {
                return;
            }
        }

        this.championService.setCurrentIndex(nextIndex);
    }

    showPreviousChampion(): void {
        if (this.champions.length === 0) return;

        let prevIndex =
            this.currentChampionIndex !== undefined
                ? (this.currentChampionIndex - 1 + this.champions.length) % this.champions.length
                : this.champions.length - 1;

        while (this.isChampionDisabled(prevIndex)) {
            prevIndex = (prevIndex - 1 + this.champions.length) % this.champions.length;

            if (prevIndex === (this.currentChampionIndex || 0)) {
                return;
            }
        }

        this.championService.setCurrentIndex(prevIndex);
    }
}
