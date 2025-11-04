import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InventorySlotComponent } from './inventory-slot.component';
import { GameItem } from '@common/grid/grid-state';
import { GameObjects } from '@common/game/game-enums';
import { ITEM_DESCRIPTION_MAP, ITEM_DISPLAY_NAMES } from '@app/constants/client-constants';

describe('InventorySlotComponent', () => {
    let component: InventorySlotComponent;
    let fixture: ComponentFixture<InventorySlotComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [InventorySlotComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(InventorySlotComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should have undefined item by default', () => {
        expect(component.item).toBeUndefined();
    });

    it('should set item when Input is provided', () => {
        const testItem: GameItem = {
            item: GameObjects.Armor,
            position: { x: -1, y: -1 },
        };
        component.item = testItem;
        fixture.detectChanges();
        expect(component.item).toEqual(testItem);
    });

    it('should return correct display name for item type', () => {
        const itemType = GameObjects.Armor;
        const expected = ITEM_DISPLAY_NAMES[itemType];
        const result = component.getItemDisplayName(itemType);
        expect(result).toEqual(expected);
    });

    it('should return correct description for item type', () => {
        const itemType = GameObjects.GladiatorHelm;
        const expected = ITEM_DESCRIPTION_MAP[itemType];
        const result = component.getItemDescription(itemType);
        expect(result).toEqual(expected);
    });

    it('should return correct display names for different item types', () => {
        const itemTypes = [GameObjects.Armor, GameObjects.Shield, GameObjects.Bomb];

        for (const itemType of itemTypes) {
            const expected = ITEM_DISPLAY_NAMES[itemType];
            const result = component.getItemDisplayName(itemType);
            expect(result).toEqual(expected);
        }
    });

    it('should return correct descriptions for different item types', () => {
        const itemTypes = [GameObjects.Armor, GameObjects.Shield, GameObjects.GladiatorHelm];

        for (const itemType of itemTypes) {
            const expected = ITEM_DESCRIPTION_MAP[itemType];
            const result = component.getItemDescription(itemType);
            expect(result).toEqual(expected);
        }
    });
});
