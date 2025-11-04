import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CombatValueDisplayComponent } from './combat-value-display.component';

describe('CombatValueDisplayComponent', () => {
    let component: CombatValueDisplayComponent;
    let fixture: ComponentFixture<CombatValueDisplayComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CombatValueDisplayComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(CombatValueDisplayComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
