import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { PlayerBannerComponent } from './player-banner.component';
import { MatDialog } from '@angular/material/dialog';
import { AddBotDialogueComponent } from '@app/components/lobby-page-components/add-bot-dialogue/add-bot-dialogue.component';

describe('PlayerBannerComponent', () => {
    let component: PlayerBannerComponent;
    let fixture: ComponentFixture<PlayerBannerComponent>;
    let lobbyServiceSpy: jasmine.SpyObj<LobbyService>;
    let dialogSpy: jasmine.SpyObj<MatDialog>;

    beforeEach(async () => {
        lobbyServiceSpy = jasmine.createSpyObj('LobbyService', ['kickPlayer']);
        dialogSpy = jasmine.createSpyObj('MatDialog', ['open']);

        await TestBed.configureTestingModule({
            imports: [PlayerBannerComponent],
            providers: [
                { provide: LobbyService, useValue: lobbyServiceSpy },
                { provide: MatDialog, useValue: dialogSpy },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(PlayerBannerComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should return first champion when championIndex is null', () => {
        component.championIndex = null;
        expect(component.currentChampion).toEqual(component.champions[0]);
    });

    it('should return correct champion when championIndex is set', () => {
        component.championIndex = '1';
        expect(component.currentChampion).toEqual(component.champions[1]);
    });

    describe('kickPlayer', () => {
        it('should call lobbyService.kickPlayer with correct parameter', () => {
            const playerToKick = 'PlayerToKick';
            component.kickPlayer(playerToKick);
            expect(lobbyServiceSpy.kickPlayer).toHaveBeenCalledWith(playerToKick);
        });

        it('should call lobbyService.kickPlayer with empty string if no name provided', () => {
            component.kickPlayer('');
            expect(lobbyServiceSpy.kickPlayer).toHaveBeenCalledWith('');
        });

        it('should call lobbyService.kickPlayer with the current playerName if none specified', () => {
            const testName = 'TestPlayer';
            component.playerName = testName;
            component.kickPlayer(component.playerName);
            expect(lobbyServiceSpy.kickPlayer).toHaveBeenCalledWith(testName);
        });
    });

    describe('addBot', () => {
        it('should open AddBotDialogueComponent dialog', () => {
            component.addBot();
            expect(dialogSpy.open).toHaveBeenCalledWith(AddBotDialogueComponent);
        });
    });
});
