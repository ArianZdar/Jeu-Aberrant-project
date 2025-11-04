import { MIN_ITEMS_CLASSIC, MIN_ITEMS_CTF, REQUIRED_SPAWNPOINTS, TOO_LONG_DESCRIPTION } from '@app/constants/server-constants';
import { GameGridDto, TileDto } from '@app/model/dto/game-info/game-grid.dto';
import { CreateGameInfoDto, UpdateGameInfoDto } from '@app/model/dto/game-info/game-info.dto';
import { GameInfo, GameInfoDocument } from '@app/model/schema/game-info.schema';
import { GameModes, GameObjects } from '@common/game/game-enums';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

interface TraversalContext {
    visited: boolean[][];
    tiles: TileDto[][];
    rows: number;
    cols: number;
}

@Injectable()
export class GameInfoService {
    constructor(@InjectModel(GameInfo.name) private readonly gameInfoModel: Model<GameInfoDocument>) {}

    async create(createGameInfoDto: CreateGameInfoDto): Promise<GameInfo> {
        const errors = await this.validateGameInfo(createGameInfoDto);

        if (errors.length > 0) {
            throw new BadRequestException({ message: 'Game creation failed', errors });
        }

        const newGameInfo = new this.gameInfoModel(createGameInfoDto);
        return await newGameInfo.save();
    }

    async find(id: string): Promise<GameInfo> {
        const game = await this.gameInfoModel.findById(id).exec();
        if (!game) {
            throw new NotFoundException(`Game with ID "${id}" not found.`);
        }
        return game;
    }

    async update(id: string, updateGameInfoDto: UpdateGameInfoDto): Promise<GameInfo> {
        const errors = await this.validateGameInfo(updateGameInfoDto, id);

        if (errors.length > 0) {
            throw new BadRequestException({ message: 'Game update failed', errors });
        }

        return this.gameInfoModel.findByIdAndUpdate(id, updateGameInfoDto, { new: true }).exec();
    }

    async delete(id: string): Promise<void> {
        const game = await this.gameInfoModel.findById(id).exec();
        if (!game) {
            throw new BadRequestException(`Game with ID "${id}" not found.`);
        }

        await this.gameInfoModel.findByIdAndDelete(id).exec();
    }

    async findAll(): Promise<GameInfo[]> {
        return this.gameInfoModel.find().exec();
    }

    private async validateGameInfo(dto: CreateGameInfoDto | UpdateGameInfoDto, id?: string): Promise<string[]> {
        const errors: string[] = [];

        await this.validateGameName(dto, errors, id);
        this.validateGameDescription(dto, errors);
        this.validateGameItems(dto, errors);
        this.validateGameGrid(dto, errors);

        return errors;
    }

    private async validateGameName(dto: CreateGameInfoDto | UpdateGameInfoDto, errors: string[], id?: string): Promise<void> {
        if (dto.name) {
            const existingGame = await this.gameInfoModel.findOne({ name: dto.name, _id: { $ne: id } }).exec();
            if (existingGame) {
                errors.push(`Un jeu possédant le nom "${dto.name}" existe déjà.`);
            }
        }

        if (!dto.name || dto.name.trim().length === 0) {
            errors.push('Le jeu doit avoir un nom (non vide).');
        }
    }

    private validateGameDescription(dto: CreateGameInfoDto | UpdateGameInfoDto, errors: string[]): void {
        if (!dto.description || dto.description.trim().length === 0) {
            errors.push('La description ne doit pas être vide.');
        } else if (dto.description.length > TOO_LONG_DESCRIPTION) {
            errors.push('La description est trop longue.');
        }
    }

    private validateGameItems(dto: CreateGameInfoDto | UpdateGameInfoDto, errors: string[]): void {
        const itemCount = dto.items?.length || 0;
        if (dto.gameMode === GameModes.CTF) {
            if (itemCount < MIN_ITEMS_CTF) {
                errors.push('La grille doit contenir au minimum 2 objets ramassables en plus du drapeau.');
            }

            const flagCount = dto.items?.filter((item) => item.item === GameObjects.Flag).length || 0;
            if (flagCount !== 1) {
                errors.push('Le mode Capture de Drapeau nécessite un drapeau sur la grille.');
            }
        } else {
            if (itemCount < MIN_ITEMS_CLASSIC) {
                errors.push('La grille doit contenir au minimum 2 objets ramassables.');
            }
        }
    }

    private validateGameGrid(dto: CreateGameInfoDto | UpdateGameInfoDto, errors: string[]): void {
        if (dto.gameGrid) {
            const gridValidation = this.isValidGameGrid(dto.gameGrid);
            if (!gridValidation.isValid) {
                errors.push('La grille de jeu est invalide pour les raisons suivantes :');
                errors.push(...gridValidation.errors);
            }
        }
    }

    private isValidGameGrid(gameGrid: GameGridDto): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        const tiles = gameGrid.tiles;
        const rows = tiles.length;
        const cols = tiles[0].length;

        if (!this.areDoorsValid(gameGrid, rows, cols)) errors.push('Une ou plusieurs portes ne sont pas placées correctement.');
        if (!this.areAllNonWallTilesAccessible(gameGrid, rows, cols)) errors.push('Certaines tuiles de terrains ne sont pas accessibles.');
        if (!this.hasEnoughTerrainTiles(gameGrid, rows, cols)) errors.push('La moitié des tuiles au minimum doivent être des tuiles de terrain.');
        if (!this.isNumberOfSpawnPointsValid(gameGrid, rows, cols))
            errors.push(`Nombre insuffisant de points de départ. Nombre requis: ${REQUIRED_SPAWNPOINTS[gameGrid.size]}.`);

        return { isValid: errors.length === 0, errors };
    }

    private areDoorsValid(gameGrid: GameGridDto, rows: number, cols: number): boolean {
        const tiles = gameGrid.tiles;

        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                if (!this.isValidDoorPlacement(i, j, tiles, rows, cols)) return false;
            }
        }

        return true;
    }

    private isWithinValidBounds(row: number, col: number, rows: number, cols: number): boolean {
        return !(row === 0 || row === rows - 1 || col === 0 || col === cols - 1);
    }

    private isValidDoorPlacement(row: number, col: number, tiles: TileDto[][], rows: number, cols: number): boolean {
        const tile = tiles[row][col];

        if (tile.tileType !== 'door') return true;

        if (!this.isWithinValidBounds(row, col, rows, cols)) return false;

        const hasVerticalWalls = tiles[row - 1][col].tileType === 'wall' && tiles[row + 1][col].tileType === 'wall';
        const hasHorizontalWalls = tiles[row][col - 1].tileType === 'wall' && tiles[row][col + 1].tileType === 'wall';
        const hasHorizontalTerrain = tiles[row][col - 1].tileType === 'terrain' && tiles[row][col + 1].tileType === 'terrain';
        const hasVerticalTerrain = tiles[row - 1][col].tileType === 'terrain' && tiles[row + 1][col].tileType === 'terrain';

        return (hasVerticalTerrain && hasHorizontalWalls) || (hasHorizontalTerrain && hasVerticalWalls);
    }

    private hasEnoughTerrainTiles(gameGrid: GameGridDto, rows: number, cols: number): boolean {
        const tiles = gameGrid.tiles;
        const terrainCount = tiles.flat().filter((tile) => tile.tileType === 'terrain').length;
        const totalTiles = rows * cols;

        return terrainCount > totalTiles / 2;
    }

    private areAllNonWallTilesAccessible(gameGrid: GameGridDto, rows: number, cols: number): boolean {
        const tiles = gameGrid.tiles;
        const visited = Array.from({ length: rows }, () => Array(cols).fill(false));

        const startTile = this.findFirstNonWallTile(rows, cols, gameGrid);
        if (!startTile) return false;

        const context: TraversalContext = {
            visited,
            tiles,
            rows,
            cols,
        };

        this.traverseDfs(startTile[0], startTile[1], context);

        return tiles.every((row, x) => row.every((tile, y) => tile.tileType === 'wall' || visited[x][y]));
    }

    private traverseDfs(row: number, col: number, context: TraversalContext): void {
        const { visited, tiles, rows, cols } = context;
        visited[row][col] = true;

        const directions = [
            [1, 0],
            [0, 1],
            [-1, 0],
            [0, -1],
        ];

        for (const [rowDirection, colDirection] of directions) {
            const nextRow = row + rowDirection;
            const nextCol = col + colDirection;

            if (this.isValidTile(nextRow, nextCol, rows, cols, tiles) && !visited[nextRow][nextCol]) {
                visited[nextRow][nextCol] = true;
                this.traverseDfs(nextRow, nextCol, context);
            }
        }
    }

    private isValidTile(x: number, y: number, rows: number, cols: number, tiles: TileDto[][]): boolean {
        return x >= 0 && x < rows && y >= 0 && y < cols && tiles[x][y].tileType !== 'wall';
    }

    private findFirstNonWallTile(rows: number, cols: number, gameGrid: GameGridDto): [number, number] | null {
        const tiles = gameGrid.tiles;
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (tiles[row][col].tileType !== 'wall') {
                    return [row, col];
                }
            }
        }
        return null;
    }

    private isNumberOfSpawnPointsValid(gameGrid: GameGridDto, rows: number, cols: number): boolean {
        const tiles = gameGrid.tiles;

        let numbersOfSpawnPoints = 0;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                numbersOfSpawnPoints = tiles[i][j].isSpawnPoint ? numbersOfSpawnPoints + 1 : numbersOfSpawnPoints;
            }
        }
        return REQUIRED_SPAWNPOINTS[gameGrid.size] === numbersOfSpawnPoints;
    }
}
