import { GameModes } from './game-enums';
import { GameGrid } from './game-info';
import { GameItem } from '../grid/grid-state';
import { PlayerInfo } from '../player/player-info';

export interface GameParams {
    id: string;
    mapId: string;
    gameMode: GameModes;
    grid: GameGrid;
    players: PlayerInfo[];
    gameItems: GameItem[];
}
