import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { GameItem } from '@common/grid/grid-state';

interface DialogData {
    items: GameItem[];
}

@Component({
    selector: 'app-inventory-full-dialog',
    standalone: true,
    imports: [CommonModule, MatButtonModule],
    templateUrl: './inventory-full-dialog.component.html',
    styleUrl: './inventory-full-dialog.component.scss',
})
export class InventoryFullDialogComponent implements OnInit {
    allItems: GameItem[] = [];
    selectedItem: GameItem | null = null;

    constructor(
        @Inject(MAT_DIALOG_DATA) public data: DialogData,
        private dialogRef: MatDialogRef<InventoryFullDialogComponent>,
    ) {}

    ngOnInit(): void {
        if (this.data && this.data.items) {
            this.allItems = [...this.data.items];
        }
    }

    selectItem(item: GameItem): void {
        this.selectedItem = item;
    }

    confirmSelection(): void {
        if (this.selectedItem) {
            this.dialogRef.close(this.selectedItem);
        }
    }
}
