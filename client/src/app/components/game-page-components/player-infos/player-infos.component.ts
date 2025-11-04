import { CommonModule } from '@angular/common';
import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { CRITICAL_TIMER, TURN_TIMER } from '@app/constants/client-constants';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { Teams } from '@common/game/game-enums';
import { Subscription, combineLatest } from 'rxjs';
@Component({
    selector: 'app-player-infos',
    imports: [CommonModule],
    templateUrl: './player-infos.component.html',
    styleUrl: './player-infos.component.scss',
})
export class PlayerInfosComponent implements OnInit, OnDestroy {
    @Input() username: string = '';
    @Input() champion: string = '';
    @Input() nbFightsWon: number = 0;
    @Input() isLeader: boolean = false;
    @Input() playerId: string = '';
    @Input() isConnected: boolean = true;
    @Input() isBot: boolean = false;
    @Input() team: Teams = Teams.None;
    @Input() hasFlag: boolean = false;
    isTurn: boolean = false;
    timerValue: number = TURN_TIMER;
    isTurnTimerPaused: boolean = false;
    protected isInCombat: boolean = false;

    private subscriptions: Subscription[] = [];

    constructor(
        private playerService: PlayerService,
        private gameStateService: GameStateService,
    ) {}

    get isTimerCritical(): boolean {
        return this.isTurn && this.timerValue < CRITICAL_TIMER && !this.isTurnTimerPaused;
    }

    ngOnInit(): void {
        this.subscriptions.push(
            this.playerService.getCurrentTurnPlayerId().subscribe((turnPlayerId) => {
                if (this.playerId) {
                    this.isTurn = this.playerId === turnPlayerId;
                }
            }),
        );

        this.subscriptions.push(
            this.playerService.getPlayerFightWins(this.playerId).subscribe((wins) => {
                this.nbFightsWon = wins;
            }),
        );

        this.subscriptions.push(
            combineLatest([this.playerService.getCurrentTurnPlayerId(), this.playerService.getTurnTimer()]).subscribe(([turnPlayerId, timer]) => {
                if (this.playerId === turnPlayerId) {
                    this.timerValue = timer;
                }
            }),
        );

        this.subscriptions.push(
            this.gameStateService.getTurnTimerPaused().subscribe((isPaused) => {
                this.isTurnTimerPaused = isPaused;
            }),
        );
    }

    ngOnDestroy(): void {
        this.subscriptions.forEach((sub) => sub.unsubscribe());
    }
}
