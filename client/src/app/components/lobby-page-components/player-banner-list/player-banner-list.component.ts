import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { PlayerBannerComponent } from '@app/components/lobby-page-components/player-banner/player-banner.component';
import { CHAMPIONS, Champion } from '@app/constants/champions';
import { PlayerInfo } from '@common/player/player-info';

interface BannerInfo {
    playerName: string;
    isLeader: boolean;
    championIndex: string;
    id: number;
    isBot: boolean;
}

@Component({
    selector: 'app-player-banner-list',
    imports: [PlayerBannerComponent],
    templateUrl: './player-banner-list.component.html',
    styleUrl: './player-banner-list.component.scss',
})
export class PlayerBannerListComponent implements OnChanges {
    @Input() playersInfo: PlayerInfo[] = [];
    @Input() maxPlayers: number;
    @Input() isLeaderVision: boolean;
    champions: Champion[] = CHAMPIONS;
    bannerList: BannerInfo[] = [];

    ngOnChanges(changes: SimpleChanges) {
        if (changes['maxPlayers'] || changes['playersInfo']) {
            this.initializeBannerList();
        }
    }

    initializeBannerList() {
        const playerBanners = this.playersInfo.map((player, index) => ({
            playerName: player.name ?? '',
            isLeader: player.isLeader ?? false,
            championIndex: String(player.championIndex ?? ''),
            id: index,
            isBot: player.isBot,
        }));

        const emptyBannerCount = Math.max(this.maxPlayers - playerBanners.length, 0);

        const emptyBanners = Array(emptyBannerCount)
            .fill(null)
            .map((_, index) => ({
                playerName: '',
                isLeader: false,
                championIndex: '',
                id: playerBanners.length + index,
                isBot: false,
            }));

        this.bannerList = [...playerBanners, ...emptyBanners];
    }
}
