import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { PlayerComponent } from '@app/components/game-page-components/player/player.component';
import { WinningCombatMessageComponent } from '@app/components/game-page-components/winning-combat-message/winning-combat-message.component';
import { TILE_CENTER_OFFSET } from '@app/constants/client-constants';
import { CombatService } from '@app/services/combat/combat.service';
import { GameGridService } from '@app/services/game-grid/game-grid.service';
import { GridContour } from '@app/services/grid-contour/grid-contour';
import { PlayerService } from '@app/services/player/player.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate, Tile, TileMaterial } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { PlayerMovementInfo } from '@common/player/player-movement-info';
import { ShortestPath } from '@common/grid/shortest-path';
import { Subject, take } from 'rxjs';
import { GameGridEventsService } from '@app/services/game-grid-events/game-grid-events.service';

@Component({
    selector: 'app-game-grid',
    imports: [CommonModule, PlayerComponent, WinningCombatMessageComponent],
    templateUrl: './game-grid.component.html',
    styleUrl: './game-grid.component.scss',
})
export class GameGridComponent implements OnChanges, OnDestroy {
    @Input() initializationFinished = false;
    protected tiles: Tile[][];
    protected size: number;
    protected showDescriptionFor: Tile | null = null;
    protected descriptionPosition: 'top' | 'bottom' = 'top';
    protected combatVictoryMessage$ = this.combat.combatVictoryMessage$;
    protected winnerUsername: string = '';
    protected winnerChampion: string = '';
    protected isDebugActive = false;
    private shortestPath: Coordinate[] = [];
    private readonly destroy$ = new Subject<void>();

    private readonly gameStateService = inject(GameStateService);
    private readonly gameGridEventsService = inject(GameGridEventsService);

    constructor(
        private readonly gameGridService: GameGridService,
        private readonly playerService: PlayerService,
        private readonly gridContour: GridContour,
        private readonly combat: CombatService,
    ) {}

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['initializationFinished']?.currentValue) {
            this.createGrid();
            this.setupSocketListeners();
            this.setupSubscriberListeners();
            this.gameGridService.updateReachableTiles();
        }
    }

    ngOnDestroy(): void {
        this.removeSocketListeners();
        this.destroy$.next();
        this.destroy$.complete();
    }

    getPlayerAtPosition(x: number, y: number): Player | undefined {
        return this.playerService.getPlayerAtPosition(x, y);
    }

    rightClickHandler(event: MouseEvent, tile: Tile, coordinate: Coordinate): void {
        event.preventDefault();
        this.gameStateService.isDebugActive$.pipe(take(1)).subscribe((isActive) => {
            if (isActive) {
                this.moveToTile(coordinate, true);
            } else {
                this.showDescription(event, tile);
            }
        });
    }

    isAttackModeActive(): boolean {
        return this.combat.getAttackModeValue();
    }

    getTileDescription(tile: Tile, i: number, j: number): string {
        return this.gameGridService.getTileDescription(tile, i, j, this.playerService.getPlayers());
    }

    canTravelToTile(x: number, y: number): boolean {
        return !this.playerService.isCurrentPlayerTurn ? false : this.gameGridService.canTravelToTile(x, y);
    }

    shouldShowSpawnPoint(x: number, y: number): boolean {
        return this.gameGridService.shouldShowSpawnPoint(x, y, this.playerService.getPlayers());
    }

    itemToShowAtPosition(position: Coordinate): GameItem | undefined {
        return this.gameGridService.itemToShowAtPosition(position);
    }

    hoverTile(x: number, y: number): void {
        this.shortestPath = [];
        if (this.canTravelToTile(x, y)) {
            this.getShortestPathLine({ x, y });
        }
    }

    leaveGrid(): void {
        this.showDescriptionFor = null;
        this.shortestPath = [];
    }

    isCurrentPlayerTurn(): boolean {
        return this.playerService.isCurrentPlayerTurn;
    }

    displayPath(): string {
        if (this.combat.getAttackModeValue() || !this.shortestPath?.length || this.shortestPath.length < 2) {
            return '';
        }
        const tileCenter = TILE_CENTER_OFFSET;
        return this.shortestPath.reduce((pathData, point, index) => {
            const command = index === 0 ? 'M' : 'L';
            return `${pathData} ${command} ${point.x + tileCenter} ${point.y + tileCenter}`;
        }, '');
    }

    getReachableAreaPath(): string {
        if (!this.playerService.isCurrentPlayerTurn) {
            return '';
        }
        return this.gridContour.getContourPath(this.gameGridService.getReachableAreaPath(), this.size);
    }

    handleTileClick(event: MouseEvent, x: number, y: number): void {
        if (event.button !== 0) return;
        if (this.combat.getAttackModeValue()) {
            const isAdjacent = this.playerService.isMainPlayerAdjacent({ x, y });
            if (!isAdjacent) return;
            const targetPlayer = this.getPlayerAtPosition(x, y);
            const clickedTile = this.tiles[y][x];
            const isDoor = clickedTile.material.includes(TileMaterial.Door);
            const isWall = clickedTile.material.includes(TileMaterial.Wall) || clickedTile.material.includes(TileMaterial.Door);
            const mainPlayer = this.playerService.getMainPlayer();
            if (targetPlayer) {
                this.combat.startCombat(targetPlayer._id);
                this.combat.setAttackMode(false);
            } else if (isWall && mainPlayer?.items.some((item) => item.item === GameObjects.Pickaxe)) {
                this.gameGridService.breakWall({ x, y });
            } else if (isDoor && !this.gameGridService.itemToShowAtPosition({ x, y })) {
                this.gameGridService.openDoor({ x, y });
            }
        } else {
            this.moveToTile({ x, y });
        }
    }

    hideCombatVictoryMessage(): void {
        this.combat.hideCombatVictoryMessage();
    }

    isPlayerFlagCarrier(x: number, y: number): boolean {
        const playerWithThisSpawn = this.playerService
            .getPlayers()
            .find((player) => player.spawnPointPosition?.x === x && player.spawnPointPosition?.y === y);

        return playerWithThisSpawn?.hasFlag ?? false;
    }

    private createGrid() {
        this.tiles = this.gameGridService.getTiles();
        this.size = this.tiles.length;
    }

    private showDescription(event: MouseEvent, tile: Tile): void {
        const tileElement = event.currentTarget as HTMLElement;
        const gridRectangle = tileElement.getBoundingClientRect();
        const isTopRow = gridRectangle.top < gridRectangle.height;
        this.showDescriptionFor = tile;
        this.descriptionPosition = isTopRow ? 'bottom' : 'top';
    }

    private moveToTile(target: Coordinate, isTeleporting?: boolean) {
        const player = this.playerService.getMainPlayer();
        if (!player) return;
        this.shortestPath = [];
        const playerMovementInfo: PlayerMovementInfo = {
            gameId: this.gameGridService.getGameId(),
            movingPlayerId: player._id,
            sourcePosition: player.position,
            targetPosition: target,
            isTeleporting,
        };
        this.gameStateService.movePlayer(playerMovementInfo);
    }

    private getShortestPathLine(coordinates: Coordinate): void {
        this.gameGridService.getShortestPathToTile(coordinates).then((path: ShortestPath) => {
            this.shortestPath = path.path;
        });
    }

    private setupSocketListeners() {
        this.gameGridEventsService.setupSocketListeners(this.tiles, this.size);
    }

    private setupSubscriberListeners(): void {
        this.combatVictoryMessage$.subscribe((message) => {
            if (message?.show && message.winnerName) {
                const winningPlayer = this.playerService.getPlayers().find((p) => p.name === message.winnerName);
                if (winningPlayer) {
                    this.winnerUsername = winningPlayer.name;
                    this.winnerChampion = winningPlayer.championName;
                }
            }
        });

        this.gameStateService.isDebugActive$.subscribe((isActive) => {
            this.isDebugActive = isActive;
        });
    }

    private removeSocketListeners() {
        this.gameGridEventsService.removeSocketListeners();
    }
}
