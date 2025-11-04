import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tool } from '@app/interfaces/client-interfaces';

@Component({
    selector: 'app-editor-tile',
    imports: [CommonModule],
    templateUrl: './editor-tile.component.html',
    styleUrl: './editor-tile.component.scss',
})
export class EditorTileComponent {
    @Input() tile!: Tool;
    @Output() tileSelected = new EventEmitter<Tool>();

    selectTile(): void {
        this.tileSelected.emit(this.tile);
    }
}
