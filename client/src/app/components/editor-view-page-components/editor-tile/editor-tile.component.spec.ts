import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { EditorTileComponent } from './editor-tile.component';
import { Tool } from '@app/interfaces/client-interfaces';

describe('EditorTileComponent', () => {
    let component: EditorTileComponent;
    let fixture: ComponentFixture<EditorTileComponent>;
    let mockTile: Tool;

    beforeEach(async () => {
        mockTile = {
            type: 'ice',
            nameDisplay: 'Glace',
            description: 'Accelere le joueur',
            image: 'assets/ice.png',
            isActive: false,
        };

        await TestBed.configureTestingModule({
            imports: [EditorTileComponent],
        }).compileComponents();

        fixture = TestBed.createComponent(EditorTileComponent);
        component = fixture.componentInstance;

        component.tile = mockTile;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should properly initialize with input tile properties', () => {
        expect(component.tile).toBe(mockTile);

        const imgElement = fixture.debugElement.query(By.css('img'));
        expect(imgElement).toBeTruthy();
        expect(imgElement.nativeElement.src).toContain(mockTile.image);

        const nameElement = fixture.debugElement.query(By.css('.description-tool span:first-child'));
        expect(nameElement.nativeElement.textContent).toBe(mockTile.nameDisplay);

        const descriptionElement = fixture.debugElement.query(By.css('.description-tool span:last-child'));
        expect(descriptionElement.nativeElement.textContent).toBe(mockTile.description);
    });

    it('should add active class when tile is active', () => {
        component.tile.isActive = true;
        fixture.detectChanges();

        const overlayElement = fixture.debugElement.query(By.css('.selected-overlay'));
        expect(overlayElement).toBeTruthy();
    });

    it('should not show active overlay when tile is not active', () => {
        component.tile.isActive = false;
        fixture.detectChanges();

        const overlayElement = fixture.debugElement.query(By.css('.selected-overlay'));
        expect(overlayElement).toBeFalsy();
    });

    it('should emit tileSelected event when selectTile is called', () => {
        spyOn(component.tileSelected, 'emit');

        component.selectTile();

        expect(component.tileSelected.emit).toHaveBeenCalledWith(mockTile);
    });

    it('should emit tileSelected event when image is clicked', () => {
        spyOn(component.tileSelected, 'emit');

        const imgElement = fixture.debugElement.query(By.css('img'));
        imgElement.triggerEventHandler('click', null);

        expect(component.tileSelected.emit).toHaveBeenCalledWith(mockTile);
    });
});
