import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CreateGameInfoComponent } from '@app/components/admin-page-components/create-game-info/create-game-info.component';
import { GameListComponent } from '@app/components/admin-page-components/game-list/game-list.component';

@Component({
    selector: 'app-admin-page',
    templateUrl: './admin-page.component.html',
    styleUrl: './admin-page.component.scss',
    imports: [RouterLink, GameListComponent, CreateGameInfoComponent, CommonModule],
})
export class AdminPageComponent {
    lightMouseStyle = {
        left: '0px',
        top: '0px',
    };
    isCreateGameInfoVisible: boolean = false;
    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        this.lightMouseStyle.left = `${event.clientX}px`;
        this.lightMouseStyle.top = `${event.clientY}px`;
    }
    toggleCreateGameInfo() {
        this.isCreateGameInfoVisible = !this.isCreateGameInfoVisible;
    }

    handleVisibilityChange(isVisible: boolean) {
        this.isCreateGameInfoVisible = isVisible;
    }
}
