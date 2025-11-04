/* eslint-disable @typescript-eslint/no-explicit-any */
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { InventoryFullDialogComponent } from './inventory-full-dialog.component';
import { GameItem } from '@common/grid/grid-state';
import { GameObjects } from '@common/game/game-enums';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

describe('InventoryFullDialogComponent', () => {
    let component: InventoryFullDialogComponent;
    let fixture: ComponentFixture<InventoryFullDialogComponent>;
    let dialogRefSpy: jasmine.SpyObj<MatDialogRef<InventoryFullDialogComponent>>;

    const INVALID_POSITION = -1;
    const VALID_POSITION_X = 2;
    const VALID_POSITION_Y = 2;
    const NEW_ITEM_POSITION_X = 3;
    const NEW_ITEM_POSITION_Y = 3;
    const FIRST_ITEM_INDEX = 0;
    const ORIGINAL_ITEMS_COUNT = 3;

    const mockItems: GameItem[] = [
        { item: GameObjects.Armor, position: { x: INVALID_POSITION, y: INVALID_POSITION } },
        { item: GameObjects.Pickaxe, position: { x: INVALID_POSITION, y: INVALID_POSITION } },
        { item: GameObjects.GladiatorHelm, position: { x: VALID_POSITION_X, y: VALID_POSITION_Y } },
    ];

    beforeEach(async () => {
        dialogRefSpy = jasmine.createSpyObj('MatDialogRef', ['close']);

        await TestBed.configureTestingModule({
            imports: [CommonModule, MatButtonModule, MatDialogModule, NoopAnimationsModule, InventoryFullDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { items: mockItems } },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(InventoryFullDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should initialize with the provided items', () => {
        expect(component.allItems[0].item).toBe(GameObjects.Armor);
        expect(component.allItems[1].item).toBe(GameObjects.Pickaxe);
        expect(component.allItems[2].item).toBe(GameObjects.GladiatorHelm);
    });

    it('should handle empty items array gracefully', () => {
        TestBed.resetTestingModule();

        TestBed.configureTestingModule({
            imports: [CommonModule, MatButtonModule, MatDialogModule, NoopAnimationsModule, InventoryFullDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: { items: [] } },
            ],
        });

        const emptyFixture = TestBed.createComponent(InventoryFullDialogComponent);
        const emptyComponent = emptyFixture.componentInstance;
        emptyFixture.detectChanges();

        expect(emptyComponent.allItems).toEqual([]);
    });

    it('should handle null data gracefully', () => {
        TestBed.resetTestingModule();

        TestBed.configureTestingModule({
            imports: [CommonModule, MatButtonModule, MatDialogModule, NoopAnimationsModule, InventoryFullDialogComponent],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefSpy },
                { provide: MAT_DIALOG_DATA, useValue: null },
            ],
        });

        const nullDataFixture = TestBed.createComponent(InventoryFullDialogComponent);
        const nullDataComponent = nullDataFixture.componentInstance;
        nullDataFixture.detectChanges();

        expect(nullDataComponent.allItems).toEqual([]);
    });

    it('should close the dialog with selected item when an item is selected and confirmed', () => {
        const selectedItem = mockItems[FIRST_ITEM_INDEX];
        component.selectItem(selectedItem);
        component.confirmSelection();

        expect(dialogRefSpy.close).toHaveBeenCalledWith(selectedItem);
    });

    it('should make a copy of the items array rather than referencing it directly', () => {
        const originalItems = component.allItems;
        const inputItems = (TestBed.inject(MAT_DIALOG_DATA) as any).items;

        inputItems.push({ item: GameObjects.Flag, position: { x: NEW_ITEM_POSITION_X, y: NEW_ITEM_POSITION_Y } });

        expect(component.allItems).toEqual(originalItems);
        expect(component.allItems.length).toBe(ORIGINAL_ITEMS_COUNT);
    });
});
