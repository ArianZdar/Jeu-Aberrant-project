import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { GameCharacterInfoComponent } from '@app/components/game-page-components/game-character-info/game-character-info.component';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { Player } from '@common/player/player';
import { Subject, takeUntil } from 'rxjs';
@Component({
    selector: 'app-player-sidebar',
    imports: [GameCharacterInfoComponent, CommonModule],
    templateUrl: './player-sidebar.component.html',
    styleUrl: './player-sidebar.component.scss',
})
export class PlayerSidebarComponent implements OnInit, OnDestroy {
    @Input() title: string;
    @Input() size: string;

    protected isInCombat: boolean = false;
    protected attackError = false;
    protected selectedTargetId: string | null;
    protected mainPlayer: Player | null;
    private destroy$ = new Subject<void>();
    private players: Player[] = [];
    private mainPlayerId: string | null;

    constructor(
        private gameStateService: GameStateService,
        private combatService: CombatService,
        private gameGridService: GameGridService,
        private playerService: PlayerService,
    ) {}

    get isPlayerTurn(): boolean {
        return this.playerService.getCurrentTurnPlayerIdValue() === this.playerService.getMainPlayerId();
    }

    async ngOnInit(): Promise<void> {
        this.gameStateService.getPlayerStats().subscribe((player) => {
            this.mainPlayer = player;
            this.mainPlayerId = player._id;
        });
        this.players = await this.gameStateService.getPlayers();

        for (const player of this.players) {
            if (player._id !== this.mainPlayerId) {
                this.selectedTargetId = player._id;
            }
        }

        this.combatService.showCombatView$.pipe(takeUntil(this.destroy$)).subscribe((inCombat) => {
            this.isInCombat = inCombat;
        });
    }

    ngOnDestroy(): void {
        this.destroy$.next();
        this.destroy$.complete();
    }

    hasEnoughActionPoints(): boolean {
        const currentPlayer = this.playerService.getMainPlayer();
        return !!currentPlayer && currentPlayer.actionPoints > 0;
    }

    handleAttack(): void {
        this.combatService.toggleAttackMode();
    }

    nextTurn() {
        this.gameStateService.nextTurn(this.gameGridService.gameId);
    }
}
