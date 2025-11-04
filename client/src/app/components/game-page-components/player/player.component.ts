import { Component, Input } from '@angular/core';
import { Coordinate } from '@common/game/game-info';

@Component({
    selector: 'app-player',
    imports: [],
    templateUrl: './player.component.html',
    styleUrl: './player.component.scss',
})
export class PlayerComponent {
    @Input() coordinate: Coordinate;
    @Input() username: string;
    @Input() champion: string;
    @Input() spawnpointCoordinate: Coordinate;

    getPlayerDescription(): string {
        return `${this.username}\n(${this.champion})`;
    }
}
