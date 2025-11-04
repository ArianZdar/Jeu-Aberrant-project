import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { AddBotDialogueComponent } from './add-bot-dialogue.component';

describe('AddBotDialogueComponent', () => {
    let component: AddBotDialogueComponent;
    let fixture: ComponentFixture<AddBotDialogueComponent>;
    let dialogRefMock: jasmine.SpyObj<MatDialogRef<AddBotDialogueComponent>>;
    let lobbyServiceMock: jasmine.SpyObj<LobbyService>;

    beforeEach(async () => {
        dialogRefMock = jasmine.createSpyObj('MatDialogRef', ['close']);
        lobbyServiceMock = jasmine.createSpyObj('LobbyService', ['addBot']);

        await TestBed.configureTestingModule({
            imports: [AddBotDialogueComponent, MatDialogModule],
            providers: [
                { provide: MatDialogRef, useValue: dialogRefMock },
                { provide: LobbyService, useValue: lobbyServiceMock },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(AddBotDialogueComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('onClose', () => {
        it('should close the dialog', () => {
            component.onClose();
            expect(dialogRefMock.close).toHaveBeenCalled();
        });
    });

    describe('addAggressiveBot', () => {
        it('should call lobbyService.addBot with true and close the dialog', () => {
            component.addAggressiveBot();
            expect(lobbyServiceMock.addBot).toHaveBeenCalledWith(true);
            expect(dialogRefMock.close).toHaveBeenCalled();
        });
    });

    describe('addDefensiveBot', () => {
        it('should call lobbyService.addBot with false and close the dialog', () => {
            component.addDefensiveBot();
            expect(lobbyServiceMock.addBot).toHaveBeenCalledWith(false);
            expect(dialogRefMock.close).toHaveBeenCalled();
        });
    });

    describe('call sequence', () => {
        it('should ensure addBot is called before closing dialog when adding aggressive bot', () => {
            spyOn(component, 'onClose').and.callThrough();
            component.addAggressiveBot();

            expect(lobbyServiceMock.addBot).toHaveBeenCalledBefore(dialogRefMock.close);
            expect(component.onClose).toHaveBeenCalled();
        });

        it('should ensure addBot is called before closing dialog when adding defensive bot', () => {
            spyOn(component, 'onClose').and.callThrough();
            component.addDefensiveBot();

            expect(lobbyServiceMock.addBot).toHaveBeenCalledBefore(dialogRefMock.close);
            expect(component.onClose).toHaveBeenCalled();
        });
    });
});
