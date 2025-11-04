import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GameActionsComponent } from './game-actions.component';
import { PlayerService } from '@app/services/player/player.service';
import { of } from 'rxjs';
import { Component, Input } from '@angular/core';
import { GameItem } from '@common/grid/grid-state';
import { mockPlayers } from '@common/player/mock-player';

@Component({
    selector: 'app-inventory-slot',
    template: '',
    standalone: true,
})
class MockInventorySlotComponent {
    @Input() item: GameItem;
}

describe('GameActionsComponent', () => {
    let component: GameActionsComponent;
    let fixture: ComponentFixture<GameActionsComponent>;

    const playerServiceMock = {
        getMainPlayerStats: jasmine.createSpy('getMainPlayerStats').and.returnValue(of(mockPlayers[0])),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameActionsComponent],
            providers: [{ provide: PlayerService, useValue: playerServiceMock }],
        })
            .overrideComponent(GameActionsComponent, {
                set: {
                    imports: [MockInventorySlotComponent],
                },
            })
            .compileComponents();

        fixture = TestBed.createComponent(GameActionsComponent);
        component = fixture.componentInstance;

        component.mainPlayerItems = mockPlayers[0].items;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should get player items from service', () => {
        expect(playerServiceMock.getMainPlayerStats).toHaveBeenCalled();
        expect(component.mainPlayerItems).toEqual(mockPlayers[0].items);
    });
});
