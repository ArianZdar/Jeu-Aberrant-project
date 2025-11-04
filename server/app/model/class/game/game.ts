import { CHAMPIONS, COIN_FLIP_PROBABILITY, VALID_GAME_ITEMS } from '@app/constants/server-constants';
import { TILE_STATE_MAP } from '@app/constants/tileStateConstants';
import { GameItem } from '@app/model/schema/game-item.schema';
import { GameModes, GameObjects, Teams } from '@common/game/game-enums';
import { Coordinate, GameGrid, Tile } from '@common/game/game-info';
import { GameParams } from '@common/game/game-params';
import { GridState } from '@common/grid/grid-state';
import { Player } from '@common/player/player';
import { PlayerInfo } from '@common/player/player-info';

export class Game {
    private _id: string = '';
    private _mapId: string = '';
    private _players: Player[] = [];
    private _spawnpoints: Coordinate[] = [];
    private _items: Set<GameItem>;
    private _gameMode: GameModes = GameModes.Classic;
    private _gridState: GridState;
    private _currentTurnHolder: number = 0;
    private _isDebugModeActive: boolean = false;

    constructor(gameParams: GameParams) {
        this._id = gameParams.id;
        this._mapId = gameParams.mapId;
        this._gameMode = gameParams.gameMode;
        this._items = new Set<GameItem>();

        this._gridState = {
            grid: Array(gameParams.grid.tiles.length)
                .fill([])
                .map(() => Array(gameParams.grid.tiles[0].length).fill(null)),
        };

        this.initializeGridState(gameParams.grid);
        this.initializePlayers(gameParams.players);
        this.assignSpawnpoints();
        if (this._gameMode === GameModes.CTF) {
            this.setTeams();
        }
        this.initializeItems(gameParams.gameItems);
    }

    get id(): string {
        return this._id;
    }

    get mapId(): string {
        return this._mapId;
    }

    get gameMode(): GameModes {
        return this._gameMode;
    }

    get gridState(): GridState {
        return this._gridState;
    }

    get players(): Player[] {
        return this._players;
    }

    get items(): Set<GameItem> {
        return this._items;
    }

    get currentPlayerId(): string {
        return this._players[this._currentTurnHolder]._id;
    }

    get isDebugModeActive(): boolean {
        return this._isDebugModeActive;
    }

    removePlayer(id: string): Player | null {
        const playerToBeRemove = this._players.find((player) => player._id === id) || null;
        if (playerToBeRemove) {
            this._players = this._players.filter((player) => player._id !== id);
        }

        return playerToBeRemove;
    }

    isTileOccupied(position: Coordinate): boolean {
        return this._players.some((player) => player.position.x === position.x && player.position.y === position.y);
    }

    movePlayer(playerId: string, newPosition: Coordinate, playerPath: Coordinate[]): Player[] {
        const player = this._players.find((p) => p._id === playerId);
        if (!player) return;

        const grid = this._gridState.grid;
        if (!grid[newPosition.x]?.[newPosition.y]) return;

        const destinationTile = grid[newPosition.x][newPosition.y];
        if (!destinationTile.isTraversable) return;

        if (this.isTileOccupied(newPosition)) return;

        const currentPosition = player.position;

        let totalCost = 0;
        for (const tile of playerPath) {
            if (tile.x === currentPosition.x && tile.y === currentPosition.y) continue;
            totalCost += grid[tile.x][tile.y].tileCost;
        }
        if (totalCost > player.speed) return;
        player.position = { ...newPosition };
        player.speed -= totalCost;
        return this._players;
    }

    teleportPlayer(playerId, newPosition) {
        const player = this._players.find((p) => p._id === playerId);
        if (!player) return;

        player.position = newPosition;
        return this._players;
    }

    toggleDebug() {
        this._isDebugModeActive = !this._isDebugModeActive;
    }

    deactivateDebug() {
        this._isDebugModeActive = false;
    }

    private initializeGridState(gameGrid: GameGrid) {
        gameGrid.tiles.forEach((row, rowIndex) => {
            row.forEach((tile, colIndex) => {
                this.initializeTileState(colIndex, rowIndex, tile);
            });
        });
    }

    private initializeTileState(x: number, y: number, tile: Tile) {
        const materialName = tile.material.split('/').pop().split('.')[0] || tile.material;
        const tileState = TILE_STATE_MAP.get(materialName);

        if (tile.isSpawnPoint) this._spawnpoints.push({ x, y });

        this._gridState.grid[x][y] = {
            ...tileState,
            spawnpoint: tile.isSpawnPoint ? GameObjects.Spawnpoint : GameObjects.None,
        };
    }

    private initializePlayers(players: PlayerInfo[]) {
        players.forEach((player) => {
            this.initializePlayer(player);
        });

        this._players.sort((a, b) => {
            if (b.speed === a.speed) {
                return Math.random() > COIN_FLIP_PROBABILITY ? 1 : -1;
            }
            return b.speed - a.speed;
        });
    }

    private initializePlayer(playerInfos: PlayerInfo) {
        const { _id, name, healthPower, attackPower, defensePower, speed, isWinner, isBot, isAggressive, isLeader, championIndex } = playerInfos;

        const player = {
            _id,
            name,
            healthPower,
            maxHealthPower: healthPower,
            attackPower,
            defensePower,
            speed,
            maxSpeed: speed,
            actionPoints: 1,
            maxActionPoints: 1,
            isWinner,
            isBot,
            isAggressive,
            isLeader,
            isTurn: false,
            isConnected: true,
            nbFightsWon: 0,
            position: { x: 0, y: 0 },
            spawnPointPosition: { x: 0, y: 0 },
            championName: CHAMPIONS[championIndex].name,
            isCombatTurn: false,
            escapesAttempts: 0,
            team: Teams.None,
            hasFlag: false,
            items: [],
            isInCombat: false,
            buffs: { attackBuff: 0, defenseBuff: 0 },
            activeBuffs: [],
        };

        this._players.push(player);
    }

    private initializeItems(gameItems: GameItem[]) {
        let itemsToBeGenerated = 0;
        const usedObjects = new Set<GameObjects>();
        const randomItemPositions: Coordinate[] = [];

        gameItems.forEach((gameItem) => {
            if (usedObjects.has(gameItem.item) || gameItem.item === GameObjects.RandomItem) {
                itemsToBeGenerated++;
                randomItemPositions.push({ x: gameItem.position.x, y: gameItem.position.y });
            } else {
                if (gameItem.item === GameObjects.Flag && this.gameMode !== GameModes.CTF) return;
                usedObjects.add(gameItem.item);
                this._items.add({ position: { x: gameItem.position.x, y: gameItem.position.y }, item: gameItem.item });
            }
        });

        const randomItems = this.generateRandomItems(usedObjects, itemsToBeGenerated);

        randomItemPositions.forEach((position, index) => {
            this._items.add({ position, item: randomItems[index] });
        });
    }

    private generateRandomItems(usedObjects: Set<GameObjects>, amount: number): GameObjects[] {
        const availableObjects = [...VALID_GAME_ITEMS].filter((obj) => !usedObjects.has(obj));

        const shuffledObjects = this.shuffleArray<GameObjects>(availableObjects);

        return shuffledObjects.slice(0, amount);
    }

    private shuffleArray<T>(array: T[]): T[] {
        const shuffled = [...array];

        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        return shuffled;
    }

    private assignSpawnpoints() {
        this._spawnpoints = this.shuffleArray<Coordinate>(this._spawnpoints);

        this._players.forEach((player, index) => {
            const spawn = this._spawnpoints[index];

            player.spawnPointPosition = { x: spawn.x, y: spawn.y };
            player.position = { x: spawn.x, y: spawn.y };
        });
    }

    private setTeams() {
        const shuffledPlayers = this.shuffleArray<Player>([...this._players]);

        const half = Math.ceil(shuffledPlayers.length / 2);

        shuffledPlayers.forEach((player, index) => {
            const originalPlayer = this._players.find((p) => p._id === player._id);
            if (originalPlayer) {
                originalPlayer.team = index < half ? Teams.BlueSide : Teams.RedSide;
            }
        });
    }
}
