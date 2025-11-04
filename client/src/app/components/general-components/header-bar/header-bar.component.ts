import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-header-bar',
    imports: [RouterLink],
    templateUrl: './header-bar.component.html',
    styleUrl: './header-bar.component.scss',
})
export class HeaderBarComponent {}
