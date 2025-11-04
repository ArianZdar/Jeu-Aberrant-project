import { ElementRef, QueryList } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { SnackBarService } from '@app/services/snack-bar/snack-bar.service';
import { LobbyService } from '@app/services/sockets/lobby/lobby.service';
import { JoinGamePageComponent } from './join-game-page.component';
import { mockLobby } from '@app/constants/mocks';
import { CODE_LENGTH } from '@app/constants/client-constants';

describe('JoinGamePageComponent', () => {
    let component: JoinGamePageComponent;
    let fixture: ComponentFixture<JoinGamePageComponent>;
    let router: Router;
    let mockLobbyService: jasmine.SpyObj<LobbyService>;
    let mockSnackBarService: jasmine.SpyObj<SnackBarService>;

    beforeEach(async () => {
        mockLobbyService = jasmine.createSpyObj('LobbyService', ['joinLobby', 'leaveLobby', 'isLobbyLocked', 'getSocketId']);
        mockLobbyService.joinLobby.and.returnValue(Promise.resolve({ hasJoinedLobby: true, lobby: mockLobby }));
        mockLobbyService.getSocketId.and.returnValue('mock-socket-id');
        mockSnackBarService = jasmine.createSpyObj('SnackBarService', ['showSnackBar']);

        await TestBed.configureTestingModule({
            imports: [JoinGamePageComponent, RouterModule.forRoot([{ path: 'champ-select', component: JoinGamePageComponent }])],
            providers: [
                { provide: LobbyService, useValue: mockLobbyService },
                { provide: SnackBarService, useValue: mockSnackBarService },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(JoinGamePageComponent);
        component = fixture.componentInstance;
        router = TestBed.inject(Router);
        spyOn(router, 'navigate');
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    describe('onInput', () => {
        it('should filter non-numeric inputs', () => {
            const mockInput = { value: 'a' } as HTMLInputElement;
            const mockEvent = { target: mockInput } as unknown as Event;
            component.codeDigits[0] = '';

            component.onInput(mockEvent, 0);
            expect(mockInput.value).toBe('');
        });

        it('should take only the first character if multiple are entered', () => {
            const mockInput = { value: '123' } as HTMLInputElement;
            const mockEvent = { target: mockInput } as unknown as Event;

            component.onInput(mockEvent, 0);
            expect(mockInput.value).toBe('1');
        });

        it('should update codeDigits array', () => {
            const mockInput = { value: '5' } as HTMLInputElement;
            const mockEvent = { target: mockInput } as unknown as Event;

            component.onInput(mockEvent, 0);
            expect(component.codeDigits[0]).toBe('5');
        });

        it('should focus next input when a value is entered', fakeAsync(() => {
            const mockInput = { value: '7' } as HTMLInputElement;
            const mockEvent = { target: mockInput } as unknown as Event;

            const inputElements = Array(CODE_LENGTH)
                .fill(null)
                .map(() => ({
                    nativeElement: { focus: jasmine.createSpy('focus') },
                })) as unknown as ElementRef[];

            component.inputs = {
                get: (index: number) => inputElements[index],
                toArray: () => inputElements,
            } as unknown as QueryList<ElementRef>;

            component.onInput(mockEvent, 0);
            tick(1);

            expect(inputElements[1].nativeElement.focus).toHaveBeenCalled();
        }));
    });

    describe('onDelete', () => {
        it('should move focus to previous input on backspace if current is empty', fakeAsync(() => {
            component.codeDigits[1] = '';
            const mockEvent = new KeyboardEvent('keydown', { key: 'Backspace' });

            const inputElements = Array(CODE_LENGTH)
                .fill(null)
                .map(() => ({
                    nativeElement: { focus: jasmine.createSpy('focus') },
                })) as unknown as ElementRef[];

            component.inputs = {
                get: (index: number) => inputElements[index],
                toArray: () => inputElements,
            } as unknown as QueryList<ElementRef>;

            component.onDelete(mockEvent, 1);
            tick(1);

            expect(inputElements[0].nativeElement.focus).toHaveBeenCalled();
        }));
    });

    describe('onEnter', () => {
        it('should call joinGame when Enter is pressed on last input and code is valid', () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            spyOn(component, 'joinGame');
            const mockEvent = {
                key: 'Enter',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.onEnter(mockEvent, CODE_LENGTH - 1);

            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(component.joinGame).toHaveBeenCalled();
        });

        it('should not call joinGame when Enter is pressed but not on last input', () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            spyOn(component, 'joinGame');
            const mockEvent = {
                key: 'Enter',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.onEnter(mockEvent, 2);

            expect(component.joinGame).not.toHaveBeenCalled();
        });

        it('should not call joinGame when key pressed is not Enter', () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            spyOn(component, 'joinGame');
            const mockEvent = {
                key: 'Space',
                preventDefault: jasmine.createSpy('preventDefault'),
            } as unknown as KeyboardEvent;

            component.onEnter(mockEvent, CODE_LENGTH - 1);

            expect(component.joinGame).not.toHaveBeenCalled();
        });
    });

    describe('handlePaste', () => {
        it('should process pasted text and extract digits', fakeAsync(() => {
            const preventDefaultSpy = jasmine.createSpy('preventDefault');

            const mockEvent = {
                preventDefault: preventDefaultSpy,
                clipboardData: { getData: () => 'abc123def4' },
            } as unknown as ClipboardEvent;

            const inputElements = Array(CODE_LENGTH)
                .fill(null)
                .map(() => ({
                    nativeElement: { value: '', focus: jasmine.createSpy('focus') },
                }));

            component.inputs = {
                get: (index: number) => inputElements[index],
                toArray: () => inputElements,
            } as unknown as QueryList<ElementRef>;

            component.handlePaste(mockEvent);
            tick(1);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(component.codeDigits).toEqual(['1', '2', '3', '4']);
            expect(inputElements[3].nativeElement.focus).toHaveBeenCalled();
        }));

        it('should do nothing when pasted text contains no digits', () => {
            const preventDefaultSpy = jasmine.createSpy('preventDefault');

            const mockEvent = {
                preventDefault: preventDefaultSpy,
                clipboardData: { getData: () => 'abcdef' },
            } as unknown as ClipboardEvent;

            spyOn(component.inputs, 'toArray');

            component.handlePaste(mockEvent);

            expect(preventDefaultSpy).toHaveBeenCalled();
            expect(component.inputs.toArray).not.toHaveBeenCalled();
        });

        it('should focus on next input when pasting partial code', fakeAsync(() => {
            const preventDefaultSpy = jasmine.createSpy('preventDefault');

            const mockEvent = {
                preventDefault: preventDefaultSpy,
                clipboardData: { getData: () => '12' },
            } as unknown as ClipboardEvent;

            const inputElements = Array(CODE_LENGTH)
                .fill(null)
                .map(() => ({
                    nativeElement: { value: '', focus: jasmine.createSpy('focus') },
                }));

            component.inputs = {
                toArray: () => inputElements,
            } as unknown as QueryList<ElementRef>;

            component.handlePaste(mockEvent);
            tick(1);

            expect(inputElements[2].nativeElement.focus).toHaveBeenCalled();
        }));

        it('should focus on last input when pasting complete code', fakeAsync(() => {
            const preventDefaultSpy = jasmine.createSpy('preventDefault');

            const mockEvent = {
                preventDefault: preventDefaultSpy,
                clipboardData: { getData: () => '1234' },
            } as unknown as ClipboardEvent;

            const inputElements = Array(CODE_LENGTH)
                .fill(null)
                .map(() => ({
                    nativeElement: { value: '', focus: jasmine.createSpy('focus') },
                }));

            component.inputs = {
                toArray: () => inputElements,
            } as unknown as QueryList<ElementRef>;

            component.handlePaste(mockEvent);
            tick(1);

            expect(inputElements[3].nativeElement.focus).toHaveBeenCalled();
        }));
    });

    describe('updateGameCode', () => {
        it('should invalidate incomplete code', () => {
            component.codeDigits = ['1', '2', '', '4'];
            component.updateGameCode();
            expect(component.isCodeValid).toBeFalse();
        });
    });

    describe('joinGame', () => {
        it('should navigate to champ-select when lobby is joined and not locked', async () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            mockLobbyService.joinLobby.and.returnValue(Promise.resolve({ hasJoinedLobby: true, lobby: mockLobby }));
            mockLobbyService.isLobbyLocked.and.returnValue(Promise.resolve(false));

            await component.joinGame();

            expect(router.navigate).toHaveBeenCalledWith(['/champ-select']);
            expect(mockSnackBarService.showSnackBar).not.toHaveBeenCalled();
        });

        it('should show snackbar and not navigate when lobby is locked', async () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            mockLobbyService.joinLobby.and.returnValue(Promise.resolve({ hasJoinedLobby: true, lobby: mockLobby }));
            mockLobbyService.isLobbyLocked.and.returnValue(Promise.resolve(true));

            await component.joinGame();

            expect(mockSnackBarService.showSnackBar).toHaveBeenCalledWith('La partie est verrouillée');
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should not navigate when joining fails', async () => {
            component.codeDigits = ['1', '2', '3', '4'];
            component.updateGameCode();
            mockLobbyService.joinLobby.and.returnValue(Promise.resolve({ hasJoinedLobby: false, lobby: mockLobby }));
            await component.joinGame();
            expect(router.navigate).not.toHaveBeenCalled();
        });

        it('should not navigate when code is invalid', () => {
            component.codeDigits = ['1', '', '3', '4'];
            component.updateGameCode();
            component.joinGame();
            expect(router.navigate).not.toHaveBeenCalled();
        });
    });
});
