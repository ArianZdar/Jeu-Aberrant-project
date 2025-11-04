import { Component, Input } from '@angular/core';

@Component({
    selector: 'app-action-counters',
    imports: [],
    templateUrl: './action-counters.component.html',
    styleUrl: './action-counters.component.scss',
})
export class ActionCountersComponent {
    @Input() movementPoints: number;
    @Input() maxMovementPoints: number;
    @Input() actionPoints: number;
    @Input() maxActionPoints: number;
}
