import { TestBed } from '@angular/core/testing';
import { GridContour } from './grid-contour';
import { TEST_COORDINATE, TEST_PATH, TEST_TILE_SIZE } from '@app/constants/test-constants';

describe('ContourServiceService', () => {
    let service: GridContour;

    beforeEach(() => {
        TestBed.configureTestingModule({});
        service = TestBed.inject(GridContour);
    });

    it('should be created', () => {
        expect(service).toBeTruthy();
    });

    it('should return empty string for empty tiles array', () => {
        const result = service.getContourPath([], TEST_TILE_SIZE);
        expect(result).toBe('');
    });

    it('should generate path for single tile', () => {
        const tiles = [TEST_COORDINATE];
        const result = service.getContourPath(tiles, TEST_TILE_SIZE);
        expect(result).not.toBe('');
        expect(result.includes('M')).toBeTrue();
        expect(result.includes('L')).toBeTrue();
    });

    it('should generate path for multiple adjacent tiles', () => {
        const result = service.getContourPath(TEST_PATH, TEST_TILE_SIZE);
        expect(result).not.toBe('');
    });
});
