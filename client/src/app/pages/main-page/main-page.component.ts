import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MOUSE_OFFSET_SCALE, CENTER_RATIO } from '@app/constants/client-constants';

@Component({
    selector: 'app-main-page',
    templateUrl: './main-page.component.html',
    styleUrls: ['./main-page.component.scss'],
    imports: [RouterLink],
})
export class MainPageComponent {
    transformStyle: string = 'translate(-50%, -50%)';

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        const { innerWidth, innerHeight } = window;
        const mouseX = event.clientX;
        const mouseY = event.clientY;

        const offsetX = (mouseX / innerWidth - CENTER_RATIO) * MOUSE_OFFSET_SCALE;
        const offsetY = (mouseY / innerHeight - CENTER_RATIO) * MOUSE_OFFSET_SCALE;

        this.transformStyle = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
    }
}
