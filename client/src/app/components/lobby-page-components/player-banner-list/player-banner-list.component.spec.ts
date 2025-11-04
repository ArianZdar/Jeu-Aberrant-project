import { SimpleChange } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlayerBannerListComponent } from './player-banner-list.component';
import { PlayerInfo } from '@common/player/player-info';

describe('PlayerBannerListComponent', () => {
    const NB_PLAYERS = 4;
    let component: PlayerBannerListComponent;
    let fixture: ComponentFixture<PlayerBannerListComponent>;
    let mockPlayersInfo: PlayerInfo[];

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayerBannerListComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerBannerListComponent);
        component = fixture.componentInstance;

        mockPlayersInfo = [
            {
                _id: '1',
                name: 'Player1',
                isLeader: true,
                championIndex: 1,
                healthPower: 100,
                attackPower: 10,
                defensePower: 5,
                speed: 3,
                isReady: false,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: false,
                isAggressive: false,
            },
            {
                _id: '2',
                name: 'Player2',
                isLeader: false,
                championIndex: 2,
                healthPower: 100,
                attackPower: 10,
                defensePower: 5,
                speed: 3,
                isReady: false,
                isAlive: true,
                isWinner: false,
                isDisconnected: false,
                isBot: false,
                isAggressive: false,
            },
        ];

        component.maxPlayers = 4;

        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('ngOnChanges', () => {
        it('should reset banner list when playersInfo changes', () => {
            component.maxPlayers = NB_PLAYERS;
            component.playersInfo = [];

            const changes = {
                playersInfo: new SimpleChange([], mockPlayersInfo, true),
            };

            component.ngOnChanges(changes);

            expect(component.bannerList.length).toBe(NB_PLAYERS);
            expect(component.bannerList[0]).toEqual({
                playerName: '',
                isLeader: false,
                championIndex: '',
                id: 0,
                isBot: false,
            });
        });

        it('should not initialize banner list when other properties change', () => {
            const initSpy = spyOn(component, 'initializeBannerList');

            const changes = {
                isLeaderVision: new SimpleChange(false, true, true),
            };

            component.ngOnChanges(changes);

            expect(initSpy).not.toHaveBeenCalled();
        });
    });

    describe('initializeBannerList', () => {
        it('should create banners for each player and fill remaining slots', () => {
            component.playersInfo = mockPlayersInfo;
            component.maxPlayers = 4;

            component['initializeBannerList']();

            expect(component.bannerList.length).toBe(NB_PLAYERS);

            expect(component.bannerList[0]).toEqual({
                playerName: 'Player1',
                isLeader: true,
                championIndex: '1',
                id: 0,
                isBot: false,
            });

            expect(component.bannerList[1]).toEqual({
                playerName: 'Player2',
                isLeader: false,
                championIndex: '2',
                id: 1,
                isBot: false,
            });

            expect(component.bannerList[2]).toEqual({
                playerName: '',
                isLeader: false,
                championIndex: '',
                id: 2,
                isBot: false,
            });

            expect(component.bannerList[3]).toEqual({
                playerName: '',
                isLeader: false,
                championIndex: '',
                id: 3,
                isBot: false,
            });
        });

        it('should handle edge cases with playerInfo properties', () => {
            const edgeCasePlayers: PlayerInfo[] = [
                {
                    _id: '3',
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    name: undefined!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    isLeader: undefined!,
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    championIndex: undefined!,
                    healthPower: 100,
                    attackPower: 10,
                    defensePower: 5,
                    speed: 3,
                    isReady: false,
                    isAlive: true,
                    isWinner: false,
                    isDisconnected: false,
                    isBot: false,
                    isAggressive: false,
                },
            ];

            component.playersInfo = edgeCasePlayers;
            component.maxPlayers = 2;

            component['initializeBannerList']();

            expect(component.bannerList[0]).toEqual({
                playerName: '',
                isLeader: false,
                championIndex: '',
                id: 0,
                isBot: false,
            });
        });
    });
});
