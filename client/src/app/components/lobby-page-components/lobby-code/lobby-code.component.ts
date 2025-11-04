import { Component, Input, ElementRef, ViewChild } from '@angular/core';
import { DELAY_CHECKMARK } from '@app/constants/client-constants';

@Component({
    selector: 'app-lobby-code',
    templateUrl: './lobby-code.component.html',
    styleUrls: ['./lobby-code.component.scss'],
})
export class LobbyCodeComponent {
    @Input() gameCode: string = '';
    @ViewChild('codeInput') codeInputElement: ElementRef;
    copyButtonImage: string = './assets/clipboard.png';

    copyToClipboard(): void {
        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(this.gameCode).then(() => this.changeImageTemporarily());
        } else {
            this.fallbackCopyToClipboard();
        }
    }

    private fallbackCopyToClipboard(): void {
        const textArea = document.createElement('textarea');
        textArea.value = this.gameCode;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);

        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        this.changeImageTemporarily();

        document.body.removeChild(textArea);
    }

    private changeImageTemporarily(): void {
        this.copyButtonImage = './assets/checkmark.png';
        setTimeout(() => {
            this.copyButtonImage = './assets/clipboard.png';
        }, DELAY_CHECKMARK);
    }
}
