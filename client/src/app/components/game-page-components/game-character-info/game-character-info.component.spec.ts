/* eslint-disable @typescript-eslint/no-explicit-any */

import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerService } from '@app/services/player/player.service';
import { of } from 'rxjs';
import { GameCharacterInfoComponent } from './game-character-info.component';
import { mockPlayers } from '@common/player/mock-player';
@Component({
    selector: 'app-game-actions',
    template: '',
    standalone: true,
})
class MockGameActionsComponent {}

@Component({
    selector: 'app-action-counters',
    template: '',
    standalone: true,
})
class MockActionCountersComponent {}

describe('GameCharacterInfoComponent', () => {
    let component: GameCharacterInfoComponent;
    let fixture: ComponentFixture<GameCharacterInfoComponent>;

    const playerInfo = {
        username: 'TestUser',
        champion: 'TestChampion',
        buffs: {
            attackBuff: 0,
            defenseBuff: 0,
        },
        health: 100,
        maxHealth: 100,
        attack: 10,
        defense: 5,
    };

    const playerServiceMock = {
        getMainPlayer: jasmine.createSpy('getMainPlayer').and.returnValue(playerInfo),
        getMainPlayerStats: jasmine.createSpy('getMainPlayerStats').and.returnValue(of(mockPlayers[0])),
    };

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [GameCharacterInfoComponent, MockGameActionsComponent, MockActionCountersComponent],
            providers: [{ provide: PlayerService, useValue: playerServiceMock }],
        }).compileComponents();

        fixture = TestBed.createComponent(GameCharacterInfoComponent);
        component = fixture.componentInstance;
        component.mainPlayerInfos = playerInfo as any;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should subscribe to main player stats', () => {
        expect(playerServiceMock.getMainPlayerStats).toHaveBeenCalled();
        expect(component.currentPlayer).toEqual(mockPlayers[0]);
    });

    it('should initialize mainPlayerInfos', () => {
        expect(component.mainPlayerInfos).toBeDefined();
        expect(component.mainPlayerInfos).toEqual(playerInfo as any);
    });

    it('should have username and champion properties defined', () => {
        component.username = playerInfo.username;
        component.champion = playerInfo.champion;
        expect(component.username).toEqual(playerInfo.username);
        expect(component.champion).toEqual(playerInfo.champion);
    });
});
