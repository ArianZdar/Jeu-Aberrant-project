import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
    providedIn: 'root',
})
export class DiceImageService {
    imagesLoaded = new BehaviorSubject<boolean>(false);
    imagesLoaded$ = this.imagesLoaded.asObservable();

    constructor() {
        this.preloadDiceImages();
    }

    async preloadDiceImages(): Promise<void> {
        const promises: Promise<void>[] = [];

        const diceTypes = ['dice_4template', 'dice_6template'];

        for (const diceType of diceTypes) {
            const promise = new Promise<void>((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => {
                    resolve();
                };
                img.src = `./assets/${diceType}.png`;
            });

            promises.push(promise);
        }

        return Promise.all(promises).then(() => {
            this.imagesLoaded.next(true);
        });
    }

    getDiceImageUrl(diceType: number): string {
        return `./assets/dice_${diceType}template.png`;
    }
}
