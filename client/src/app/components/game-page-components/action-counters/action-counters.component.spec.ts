import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActionCountersComponent } from './action-counters.component';

describe('ActionCountersComponent', () => {
    let component: ActionCountersComponent;
    let fixture: ComponentFixture<ActionCountersComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [ActionCountersComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(ActionCountersComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
