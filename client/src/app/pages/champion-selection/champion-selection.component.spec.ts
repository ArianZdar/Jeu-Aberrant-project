import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { ChampDisplayComponent } from '@app/components/champion-selection-page-components/champ-display/champ-display.component';
import { ChampionListComponent } from '@app/components/champion-selection-page-components/champion-list/champion-list.component';
import { ChampInfoComponent } from '@app/components/champion-selection-page-components/champ-info/champ-info.component';
import { GameStatusValidationService } from '@app/services/game-status-validation/game-status-validation.service';
import { GameService } from '@app/services/game/game.service';
import { ChampionIndexService } from '@app/services/champion-index/champion-index.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { ChampionSelectionComponent } from './champion-selection.component';
import { MockChampDisplayComponent, MockChampionListComponent, MockChampInfoComponent } from '@app/constants/component-mocks';

describe('ChampionSelectionComponent', () => {
    let component: ChampionSelectionComponent;
    let fixture: ComponentFixture<ChampionSelectionComponent>;
    let mockServices: {
        game: jasmine.SpyObj<GameService>;
        router: jasmine.SpyObj<Router>;
        snackBar: jasmine.SpyObj<MatSnackBar>;
        gameStatusValidation: jasmine.SpyObj<GameStatusValidationService>;
        lobbyService: jasmine.SpyObj<LobbyService>;
        championIndexService: jasmine.SpyObj<ChampionIndexService>;
        gameStateService: jasmine.SpyObj<GameStateService>;
    };

    const setupMocks = () => {
        mockServices = {
            game: jasmine.createSpyObj('GameService', ['getGameById']),
            router: jasmine.createSpyObj('Router', ['navigate']),
            snackBar: jasmine.createSpyObj('MatSnackBar', ['open']),
            gameStatusValidation: jasmine.createSpyObj('GameStatusValidationService', ['validation']),
            lobbyService: jasmine.createSpyObj('LobbyService', ['isSocketAlive', 'leaveLobby', 'getSocketId']),
            championIndexService: jasmine.createSpyObj('ChampionIndexService', ['resetIndex', 'quitChampionSelection']),
            gameStateService: jasmine.createSpyObj('GameStateService', ['rebindSocketId']),
        };
    };

    const setupTestBed = async () => {
        await TestBed.configureTestingModule({
            imports: [ChampionSelectionComponent],
            providers: [
                { provide: GameService, useValue: mockServices.game },
                { provide: Router, useValue: mockServices.router },
                { provide: MatSnackBar, useValue: mockServices.snackBar },
                { provide: GameStatusValidationService, useValue: mockServices.gameStatusValidation },
                { provide: LobbyService, useValue: mockServices.lobbyService },
                { provide: ChampionIndexService, useValue: mockServices.championIndexService },
                { provide: GameStateService, useValue: mockServices.gameStateService },
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: { get: () => null } } },
                },
            ],
        })
            .overrideComponent(ChampionSelectionComponent, {
                remove: { imports: [ChampDisplayComponent, ChampionListComponent, ChampInfoComponent] },
                add: { imports: [MockChampDisplayComponent, MockChampionListComponent, MockChampInfoComponent] },
            })
            .compileComponents();

        fixture = TestBed.createComponent(ChampionSelectionComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    };

    beforeEach(async () => {
        setupMocks();
        await setupTestBed();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should call leaveLobby', () => {
        component.leaveLobby();
        expect(mockServices.championIndexService.quitChampionSelection).toHaveBeenCalled();
        expect(mockServices.lobbyService.leaveLobby).toHaveBeenCalled();
        expect(mockServices.router.navigate).toHaveBeenCalledWith(['/home']);
    });

    it('should rebind socket ID during initialization if socket is alive', async () => {
        mockServices.lobbyService.isSocketAlive.and.returnValue(true);

        await component.ngOnInit();

        expect(mockServices.gameStateService.rebindSocketId).toHaveBeenCalled();
    });

    it('should navigate to home if socket is not alive during initialization', async () => {
        mockServices.lobbyService.isSocketAlive.and.returnValue(false);

        await component.ngOnInit();

        expect(mockServices.router.navigate).toHaveBeenCalledWith(['/home']);
        expect(mockServices.gameStateService.rebindSocketId).not.toHaveBeenCalled();
    });
});
