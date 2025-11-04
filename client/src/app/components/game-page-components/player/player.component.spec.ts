import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerComponent } from './player.component';

describe('PlayerComponent', () => {
    let component: PlayerComponent;
    let fixture: ComponentFixture<PlayerComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerComponent);
        component = fixture.componentInstance;

        component.username = 'TestUser';
        component.champion = 'TestChampion';

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return correct player description', () => {
        const expectedDescription = 'TestUser\n(TestChampion)';
        expect(component.getPlayerDescription()).toEqual(expectedDescription);
    });
});
