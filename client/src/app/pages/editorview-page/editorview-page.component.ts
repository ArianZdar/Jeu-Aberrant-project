import { Component, OnInit } from '@angular/core';
import { GridComponent } from '@app/components/editor-view-page-components/grid/grid.component';
import { EditorToolbarComponent } from '@app/components/editor-view-page-components/editor-toolbar/editor-toolbar.component';
import { Router, RouterLink } from '@angular/router';
import { FormDataService } from '@app/services/form-data/form-data.service';

@Component({
    selector: 'app-editorview-page',
    imports: [GridComponent, EditorToolbarComponent, RouterLink],
    templateUrl: './editorview-page.component.html',
    styleUrl: './editorview-page.component.scss',
})
export class EditorviewPageComponent implements OnInit {
    constructor(
        private readonly formDataService: FormDataService,
        private readonly router: Router,
    ) {}

    ngOnInit(): void {
        if (!this.formDataService.getFormWasFilled()) {
            this.router.navigate(['/admin']);
        }
    }
}
