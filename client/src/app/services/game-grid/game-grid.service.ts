import { Injectable } from '@angular/core';
import { ITEM_DESCRIPTION_MAP, ITEM_DISPLAY_NAMES, TILE_DESCRIPTION_MAP } from '@app/constants/client-constants';
import { GameService } from '@app/services/game/game.service';
import { GameStateService } from '@app/services/sockets/game-state/game-state.service';
import { Coordinate, Tile, TILE_IMAGE_URLS, TileMaterial, TileType } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { ShortestPath } from '@common/grid/shortest-path';

@Injectable({
    providedIn: 'root',
})
export class GameGridService {
    gameId: string;
    tiles: Tile[][] = [[]];
    size: number;
    items: Set<GameItem> = new Set<GameItem>();
    private reachableTiles: Coordinate[] = [];
    private title: string;
    private playerId: string;

    constructor(
        private readonly gameService: GameService,
        private readonly gameStateService: GameStateService,
    ) {}

    setGameId(gameId: string): void {
        this.gameId = gameId;
    }

    setPlayerId(playerId: string): void {
        this.playerId = playerId;
    }

    async setTilesByGameId(id: string): Promise<void> {
        return new Promise<void>((resolve) => {
            this.gameService.getGameById(id).subscribe({
                next: (game) => {
                    this.tiles = game.gameGrid.tiles;
                    this.title = game.name;
                    this.size = this.tiles.length;
                    resolve();
                },
            });
        });
    }

    getGameId(): string {
        return this.gameId;
    }

    getTiles(): Tile[][] {
        return this.tiles;
    }

    getTitle(): string {
        return this.title;
    }

    getSize(): string {
        return `(${this.size}x${this.size})`;
    }

    canTravelToTile(x: number, y: number): boolean {
        return this.reachableTiles.some((tile) => tile.x === x && tile.y === y);
    }

    updateDoor(targetDoor: Coordinate): void {
        const { x, y } = targetDoor;

        if (this.tiles?.[y]?.[x]) {
            const currentMaterial = this.tiles[y][x].material;

            let newMaterial = currentMaterial;
            if (currentMaterial === TILE_IMAGE_URLS[TileMaterial.Door]) {
                newMaterial = TILE_IMAGE_URLS[TileMaterial.OpenDoor];
            } else if (currentMaterial === TILE_IMAGE_URLS[TileMaterial.OpenDoor]) {
                newMaterial = TILE_IMAGE_URLS[TileMaterial.Door];
            }
            this.tiles[y][x].material = newMaterial;

            this.updateReachableTiles();
        }
    }

    updateWall(targetWall: Coordinate): void {
        const { x, y } = targetWall;
        const isLighterTile = (x + y) % 2 !== 0;
        if (this.tiles?.[y]?.[x]) {
            this.tiles[y][x].material = isLighterTile ? TILE_IMAGE_URLS[TileMaterial.GrassLighter] : TILE_IMAGE_URLS[TileMaterial.Grass];
            this.tiles[y][x].tileType = TileType.Terrain;
        }
        this.updateReachableTiles();
    }

    setItems(items: Set<GameItem>): void {
        this.items = items;
    }

    async updateReachableTiles(): Promise<void> {
        return new Promise<void>((resolve) => {
            this.gameStateService
                .getAccessibleTiles()
                .then((tiles: Coordinate[]) => {
                    this.reachableTiles = tiles;
                    resolve();
                })
                .catch(() => {
                    this.reachableTiles = [];
                    resolve();
                });
        });
    }

    getReachableAreaPath(): Coordinate[] {
        const reachableTiles: Coordinate[] = [];
        for (let i = 0; i < this.size; i++) {
            for (let j = 0; j < this.size; j++) {
                if (this.canTravelToTile(i, j)) {
                    reachableTiles.push({ x: i, y: j });
                }
            }
        }
        return reachableTiles;
    }

    async getShortestPathToTile(tile: Coordinate): Promise<ShortestPath> {
        return new Promise<ShortestPath>((resolve) => {
            this.gameStateService
                .getShortestPathToTile(this.gameId, this.playerId, tile)
                .then((path: ShortestPath) => {
                    resolve(path);
                })
                .catch(() => {
                    resolve({ path: [], firstItemOnPath: undefined });
                });
        });
    }

    async openDoor(tile: Coordinate) {
        await this.gameStateService.useDoor(tile);
    }

    async breakWall(tile: Coordinate) {
        await this.gameStateService.breakWall(tile);
    }

    getTileAt(position?: Coordinate): Tile | undefined {
        if (!position) return undefined;
        const { x, y } = position;
        if (this.tiles?.[y]?.[x]) {
            return this.tiles[y][x];
        }
        return undefined;
    }

    getTileDescription(tile: Tile, i: number, j: number, players: Player[]): string {
        let description = '';
        const player = players.find((targetPlayer) => targetPlayer.position.x === i && targetPlayer.position.y === j);
        if (player?.isConnected) {
            description += player.name + '\n';
            description += '(' + player.championName + ')';
        } else if (this.itemToShowAtPosition({ x: i, y: j })) {
            const item = this.itemToShowAtPosition({ x: i, y: j });
            if (item) {
                description += ITEM_DISPLAY_NAMES[item.item] + ':\n';
                description += ITEM_DESCRIPTION_MAP[item.item] + '\n';
            }
        } else if (this.shouldShowSpawnPoint(i, j, players)) {
            description += 'Point de départ';
        } else {
            description += 'Type: ' + this.getTileName(tile.material);
        }
        return description;
    }

    itemToShowAtPosition(position: Coordinate): GameItem | undefined {
        for (const item of this.items) {
            if (item.position.x === position.x && item.position.y === position.y) {
                return item;
            }
        }
        return undefined;
    }

    shouldShowSpawnPoint(x: number, y: number, players: Player[]): boolean {
        if (!this.tiles?.[y]?.[x]?.isSpawnPoint) {
            return false;
        }
        const playerWithThisSpawn = players.find((player) => player.spawnPointPosition?.x === x && player.spawnPointPosition?.y === y);
        return playerWithThisSpawn?.isConnected ?? false;
    }

    reset(): void {
        this.gameId = '';
        this.playerId = '';
        this.tiles = [[]];
        this.reachableTiles = [];
        this.title = '';
        this.size = 0;
    }

    private getTileName(url: string): string {
        const tileDescription = TILE_DESCRIPTION_MAP.get(url);
        return tileDescription ? tileDescription.name + '\n' + tileDescription.description : 'Default';
    }
}
