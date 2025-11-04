import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { AdminPageComponent } from '@app/pages/admin-page/admin-page.component';
import { GameService } from '@app/services/game/game.service';
import { GameModes } from '@common/game/game-enums';
import { environment } from 'src/environments/environment';

describe('AdminPageComponent', () => {
    let component: AdminPageComponent;
    let fixture: ComponentFixture<AdminPageComponent>;
    let httpMock: HttpTestingController;
    const activatedRouteSpy = jasmine.createSpyObj('ActivatedRoute', ['params']);

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [AdminPageComponent],
            providers: [
                provideHttpClient(withInterceptorsFromDi()),
                provideHttpClientTesting(),
                GameService,
                {
                    provide: ActivatedRoute,
                    useValue: activatedRouteSpy,
                },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AdminPageComponent);
        component = fixture.componentInstance;
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('should create', () => {
        const mockGameInfo = [
            {
                name: 'Test Game',
                description: 'Test Description',
                gameMode: GameModes.Classic,
                gameGrid: {
                    tiles: [
                        [
                            {
                                isTraversable: true,
                                tileType: 'grass',
                                material: 'grass',
                                isSpawnPoint: false,
                            },
                        ],
                    ],
                    size: '10x10',
                },
                lastChange: new Date(),
                isHidden: false,
            },
        ];

        fixture.detectChanges();

        const req = httpMock.expectOne(`${environment.serverUrl}/game-info`);
        expect(req.request.method).toBe('GET');
        req.flush(mockGameInfo);

        fixture.detectChanges();

        expect(component).toBeTruthy();
    });

    it('toggleCreateGameInfo() should toggle isCreateGameInfoVisible', () => {
        component.isCreateGameInfoVisible = false;
        component.toggleCreateGameInfo();
        expect(component.isCreateGameInfoVisible).toBe(true);
    });

    it('handleVisibilityChange() should set isCreateGameInfoVisible to visible', () => {
        component.isCreateGameInfoVisible = false;
        component.handleVisibilityChange(true);
        expect(component.isCreateGameInfoVisible).toBe(true);
    });

    it('onMouseMove() should update lightMouseStyle', () => {
        const event = new MouseEvent('mousemove', {
            clientX: 10,
            clientY: 20,
        });
        component.onMouseMove(event);
        expect(component.lightMouseStyle.left).toBe('10px');
        expect(component.lightMouseStyle.top).toBe('20px');
    });
});
