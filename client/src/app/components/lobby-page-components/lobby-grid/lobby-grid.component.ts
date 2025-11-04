import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-lobby-grid',
    imports: [],
    templateUrl: './lobby-grid.component.html',
    styleUrl: './lobby-grid.component.scss',
})
export class LobbyGridComponent {
    @Input() gridName: string = '';
    @Input() gameMode: string = '';
    @Input() description: string = '';
    @Input() image: string = '';
}
