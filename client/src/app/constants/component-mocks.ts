// lint ignore est utilisé, car ce fichier contient tout les mocks utilisés uniquement lors des tests unitaires regroupés à 1 endroit
/* eslint-disable max-classes-per-file */
import { Component, Input } from '@angular/core';
import { Champion } from '@app/constants/champions';

@Component({
    selector: 'app-champ-display',
    template: '',
    standalone: true,
})
export class MockChampDisplayComponent {
    @Input() champions: Champion[];
}

@Component({
    selector: 'app-champion-list',
    template: '',
    standalone: true,
})
export class MockChampionListComponent {}

@Component({
    selector: 'app-champ-info',
    template: '',
    standalone: true,
})
export class MockChampInfoComponent {
    @Input() _id: string;
}

@Component({
    selector: 'app-player-list',
    template: '',
    standalone: true,
})
export class MockPlayerListComponent {}

@Component({
    selector: 'app-player-sidebar',
    template: '',
    standalone: true,
})
export class MockPlayerSidebarComponent {
    @Input() title: string;
    @Input() size: string;
}

@Component({
    selector: 'app-game-grid',
    template: '',
    standalone: true,
})
export class MockGameGridComponent {
    @Input() initializationFinished: boolean;
}

@Component({
    selector: 'app-game-chat',
    template: '',
    standalone: true,
})
export class MockGameChatComponent {}

@Component({
    selector: 'app-surrender-dialog',
    template: '',
    standalone: true,
})
export class MockSurrenderDialogComponent {}
