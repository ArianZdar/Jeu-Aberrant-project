import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PowerBarComponent } from './power-bar.component';
import { MIN_POWER, MAX_POWER, POINTS_PER_POWER, BONUS_POINTS } from '@app/constants/client-constants';

describe('PowerBarComponent', () => {
    let component: PowerBarComponent;
    let fixture: ComponentFixture<PowerBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PowerBarComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PowerBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('increasePower', () => {
        it('should increase power and points, and emit powerChange', () => {
            spyOn(component.powerChange, 'emit');

            component.power = MIN_POWER;
            component.points = MIN_POWER * POINTS_PER_POWER;
            component.increasePower();

            expect(component.power).toBe(MIN_POWER + 1);
            expect(component.points).toBe((MIN_POWER + 1) * POINTS_PER_POWER);
            expect(component.powerChange.emit).toHaveBeenCalledWith(MIN_POWER + 1);
        });

        it('should not increase power or points when power is at MAX_POWER', () => {
            spyOn(component.powerChange, 'emit');

            component.power = MAX_POWER;
            component.points = MAX_POWER * POINTS_PER_POWER;
            component.increasePower();

            expect(component.power).toBe(MAX_POWER);
            expect(component.points).toBe(MAX_POWER * POINTS_PER_POWER);
            expect(component.powerChange.emit).not.toHaveBeenCalled();
        });
    });

    it('togglePower() should toggle power between MIN_POWER and MAX_POWER, and emit powerChange', () => {
        spyOn(component.powerChange, 'emit');

        component.power = MIN_POWER;
        component.togglePower();

        expect(component.power).toBe(MAX_POWER);
        expect(component.points).toBe(MAX_POWER * POINTS_PER_POWER);
        expect(component.powerChange.emit).toHaveBeenCalledWith(MAX_POWER);

        component.togglePower();

        expect(component.power).toBe(MIN_POWER);
        expect(component.points).toBe(MIN_POWER * POINTS_PER_POWER);
        expect(component.powerChange.emit).toHaveBeenCalledWith(MIN_POWER);
    });

    describe('pointsDisplay', () => {
        it('should return points with bonus when power is at MAX_POWER', () => {
            component.power = MAX_POWER;
            component.points = MAX_POWER * POINTS_PER_POWER;
            expect(component.pointsDisplay).toBe(`${MAX_POWER * POINTS_PER_POWER} (+${BONUS_POINTS})`);
        });

        it('should return points without bonus when power is below MAX_POWER', () => {
            component.power = MIN_POWER;
            component.points = MIN_POWER * POINTS_PER_POWER;
            expect(component.pointsDisplay).toBe(`${MIN_POWER * POINTS_PER_POWER}`);
        });
    });
});
