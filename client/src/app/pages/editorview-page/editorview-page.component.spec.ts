import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { EditorToolbarComponent } from '@app/components/editor-view-page-components/editor-toolbar/editor-toolbar.component';
import { GridComponent } from '@app/components/editor-view-page-components/grid/grid.component';
import { EditorviewPageComponent } from './editorview-page.component';

describe('EditorviewPageComponent', () => {
    let component: EditorviewPageComponent;
    let fixture: ComponentFixture<EditorviewPageComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [EditorviewPageComponent, GridComponent, EditorToolbarComponent],
            providers: [provideHttpClient(withInterceptorsFromDi()), provideHttpClientTesting(), provideRouter([])],
        }).compileComponents();
    });

    beforeEach(() => {
        fixture = TestBed.createComponent(EditorviewPageComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
