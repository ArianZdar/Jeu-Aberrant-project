import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { FormDataService } from '@app/services/form-data/form-data.service';
import { GameService } from '@app/services/game/game.service';
import { Router } from '@angular/router';
import { SIZE_DISPLAY_MAP } from '@app/constants/client-constants';

@Component({
    selector: 'app-game-preview',
    standalone: true,
    imports: [],
    templateUrl: './game-preview.component.html',
    styleUrl: './game-preview.component.scss',
})
export class GamePreviewComponent implements OnInit {
    @Input() _id: string = '';
    @Input() image: string = '';
    @Input() name: string = '';
    @Input() size: string = '';
    @Input() mode: string = '';
    @Input() isHidden: boolean = true;
    @Input() lastModified: Date | string = new Date();
    @Input() description: string = '';

    @Output() toggleHidden = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();
    @Output() edit = new EventEmitter<void>();

    currentEyeButtonImage: string = this.eyeButtonImage;

    constructor(
        private readonly gameService: GameService,
        private formDataService: FormDataService,
        private router: Router,
    ) {}

    get eyeButtonImage(): string {
        return this.isHidden ? 'assets/nEye.png' : 'assets/eye.png';
    }

    get eyeButtonHoverImage(): string {
        return this.isHidden ? 'assets/nEye-hover.png' : 'assets/eye-hover.png';
    }

    get inverseButtonHoverImage(): string {
        return this.currentEyeButtonImage === 'assets/nEye-hover.png' ? 'assets/eye-hover.png' : 'assets/nEye-hover.png';
    }

    ngOnInit(): void {
        this.currentEyeButtonImage = this.eyeButtonImage;
    }

    onDelete(): void {
        this.delete.emit();
    }

    onToggleHidden(): void {
        this.isHidden = !this.isHidden;
        this.currentEyeButtonImage = this.eyeButtonHoverImage;
        this.toggleHidden.emit();
    }

    onEdit(): void {
        this.gameService.getGameById(this._id).subscribe({
            next: () => {
                this.formDataService.isModifyingAGame(true, this._id);
                this.router.navigate(['/editorview']);
            },
            error: () => {
                this.delete.emit();
            },
        });
    }

    onMouseEnterEyeButton(): void {
        this.currentEyeButtonImage = this.eyeButtonHoverImage;
    }

    onMouseLeaveEyeButton(): void {
        this.currentEyeButtonImage = this.eyeButtonImage;
    }

    getSizeDisplay(): string {
        return SIZE_DISPLAY_MAP.get(this.size) || '';
    }

    getDateDisplay(): string {
        const date: Date = typeof this.lastModified === 'string' ? new Date(this.lastModified) : this.lastModified;
        const dateString = date.toLocaleDateString('fr-CA', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
        const timeString = date.toLocaleTimeString('fr-CA', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `${dateString}, ${timeString}`;
    }
}
