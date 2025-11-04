import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LobbyGridComponent } from './lobby-grid.component';

describe('LobbyGridComponent', () => {
    let component: LobbyGridComponent;
    let fixture: ComponentFixture<LobbyGridComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LobbyGridComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(LobbyGridComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
