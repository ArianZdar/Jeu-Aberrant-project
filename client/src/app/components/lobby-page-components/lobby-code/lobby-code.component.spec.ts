import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { LobbyCodeComponent } from './lobby-code.component';
import { By } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';

const DELAY_CHECKMARK = 500;

interface ComponentWithPrivateMethods {
    changeImageTemporarily: () => void;
}

describe('LobbyCodeComponent', () => {
    let component: LobbyCodeComponent;
    let fixture: ComponentFixture<LobbyCodeComponent>;

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [LobbyCodeComponent, CommonModule],
        }).compileComponents();

        fixture = TestBed.createComponent(LobbyCodeComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('should create', () => {
        expect(component).toBeTruthy();
    });

    it('should display the game code', () => {
        const testCode = 'ABC123';
        component.gameCode = testCode;
        fixture.detectChanges();

        const codeElement = fixture.debugElement.query(By.css('.code-display'));
        expect(codeElement.nativeElement.textContent).toContain(testCode);
    });

    it('should change the image temporarily when the copy button is clicked', fakeAsync(() => {
        const changeImageSpy = spyOn<ComponentWithPrivateMethods>(
            component as unknown as ComponentWithPrivateMethods,
            'changeImageTemporarily',
        ).and.callThrough();

        component.gameCode = '0000';
        fixture.detectChanges();

        expect(component.copyButtonImage).toBe('./assets/clipboard.png');

        component.copyToClipboard = jasmine.createSpy('copyToClipboard').and.callFake(() => {
            (component as unknown as ComponentWithPrivateMethods).changeImageTemporarily();
        });

        const copyButton = fixture.debugElement.query(By.css('.copy-button'));
        copyButton.triggerEventHandler('click', null);

        expect(component.copyToClipboard).toHaveBeenCalled();
        expect(changeImageSpy).toHaveBeenCalled();
        expect(component.copyButtonImage).toBe('./assets/checkmark.png');

        tick(DELAY_CHECKMARK);

        expect(component.copyButtonImage).toBe('./assets/clipboard.png');
    }));

    it('should execute fallback mechanism when clipboard API is not available', fakeAsync(() => {
        const originalClipboard = navigator.clipboard;
        const originalIsSecureContext = window.isSecureContext;

        Object.defineProperty(navigator, 'clipboard', { value: null, configurable: true });
        Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true });

        const mockTextArea = document.createElement('textarea');
        spyOn(mockTextArea, 'focus');
        spyOn(mockTextArea, 'select');

        spyOn(document, 'createElement').and.returnValue(mockTextArea);
        spyOn(document.body, 'appendChild');
        spyOn(document.body, 'removeChild');
        spyOn(document, 'execCommand').and.returnValue(true);
        const changeImageSpy = spyOn<ComponentWithPrivateMethods>(
            component as unknown as ComponentWithPrivateMethods,
            'changeImageTemporarily',
        ).and.callThrough();

        component.gameCode = 'TEST123';
        component.copyToClipboard();

        expect(document.createElement).toHaveBeenCalledWith('textarea');
        expect(mockTextArea.value).toBe('TEST123');
        expect(mockTextArea.style.position).toBe('fixed');
        expect(mockTextArea.style.left).toBe('-999999px');
        expect(mockTextArea.style.top).toBe('-999999px');
        expect(document.body.appendChild).toHaveBeenCalled();
        expect(mockTextArea.focus).toHaveBeenCalled();
        expect(mockTextArea.select).toHaveBeenCalled();
        expect(document.execCommand).toHaveBeenCalledWith('copy');
        expect(changeImageSpy).toHaveBeenCalled();
        expect(document.body.removeChild).toHaveBeenCalled();

        tick(DELAY_CHECKMARK);

        Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
        Object.defineProperty(window, 'isSecureContext', { value: originalIsSecureContext, configurable: true });
    }));

    it('should directly use clipboard API when available', fakeAsync(() => {
        const originalClipboard = navigator.clipboard;
        if (!originalClipboard) {
            Object.defineProperty(navigator, 'clipboard', {
                value: { writeText: async () => Promise.resolve() },
                configurable: true,
            });
        }

        Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });

        const writeTextSpy = spyOn(navigator.clipboard, 'writeText').and.returnValue(Promise.resolve());
        const changeImageSpy = spyOn<ComponentWithPrivateMethods>(
            component as unknown as ComponentWithPrivateMethods,
            'changeImageTemporarily',
        ).and.callThrough();

        component.gameCode = 'DIRECT123';
        component.copyToClipboard();

        tick();

        expect(writeTextSpy).toHaveBeenCalledWith('DIRECT123');
        expect(changeImageSpy).toHaveBeenCalled();

        tick(DELAY_CHECKMARK);

        if (!originalClipboard) {
            Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true });
        }
    }));

    it('should handle changeImageTemporarily method correctly', fakeAsync(() => {
        (component as unknown as ComponentWithPrivateMethods).changeImageTemporarily();

        expect(component.copyButtonImage).toBe('./assets/checkmark.png');

        tick(DELAY_CHECKMARK);

        expect(component.copyButtonImage).toBe('./assets/clipboard.png');
    }));
});
