import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { DiceImageService } from './dice-image.service';

const IMAGE_ERROR_DELAY_MS = 10;
const TEST_COMPLETION_DELAY_MS = 50;
const DICE_TYPE_SIX = 6;
const DICE_TYPE_FOUR = 4;

type ImageConstructor = new () => HTMLImageElement;

describe('DiceImageService', () => {
    let service: DiceImageService;
    let originalImage: ImageConstructor;

    beforeAll(() => {
        originalImage = window.Image;
    });

    afterAll(() => {
        window.Image = originalImage;
    });

    beforeEach(() => {
        TestBed.configureTestingModule({});
    });

    it('should be created', () => {
        service = TestBed.inject(DiceImageService);
        expect(service).toBeTruthy();
    });

    it('should return correct dice image URL', () => {
        service = TestBed.inject(DiceImageService);
        expect(service.getDiceImageUrl(DICE_TYPE_SIX)).toBe('./assets/dice_6template.png');
        expect(service.getDiceImageUrl(DICE_TYPE_FOUR)).toBe('./assets/dice_4template.png');
    });

    it('should handle image load errors and still set imagesLoaded to true', fakeAsync(() => {
        class MockImage {
            src: string = '';

            constructor() {
                setTimeout(() => {
                    this.onerror();
                }, IMAGE_ERROR_DELAY_MS);
            }

            onload(): void {
                return;
            }
            onerror(): void {
                return;
            }
        }

        window.Image = MockImage as unknown as ImageConstructor;

        service = TestBed.inject(DiceImageService);

        let loadedState = false;
        service.imagesLoaded$.subscribe((state) => {
            loadedState = state;
        });

        expect(loadedState).toBeFalse();

        tick(TEST_COMPLETION_DELAY_MS);

        expect(loadedState).toBeTrue();
    }));

    it('should set imagesLoaded to true when images load successfully', fakeAsync(() => {
        class MockImage {
            src: string = '';

            constructor() {
                setTimeout(() => {
                    this.onload();
                }, IMAGE_ERROR_DELAY_MS);
            }

            onload(): void {
                return;
            }
            onerror(): void {
                return;
            }
        }

        window.Image = MockImage as unknown as ImageConstructor;

        service = TestBed.inject(DiceImageService);

        let loadedState = false;
        service.imagesLoaded$.subscribe((state) => {
            loadedState = state;
        });

        expect(loadedState).toBeFalse();

        tick(TEST_COMPLETION_DELAY_MS);

        expect(loadedState).toBeTrue();
    }));
});
