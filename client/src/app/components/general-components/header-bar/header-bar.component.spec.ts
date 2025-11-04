import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { HeaderBarComponent } from './header-bar.component';

describe('HeaderBarComponent', () => {
    let component: HeaderBarComponent;
    let fixture: ComponentFixture<HeaderBarComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [HeaderBarComponent],
            providers: [{ provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => null } } } }],
        }).compileComponents();

        fixture = TestBed.createComponent(HeaderBarComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
