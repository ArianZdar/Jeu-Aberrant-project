import { PlayerInfo } from '../player/player-info';

export interface GameConfig {
    id: string;
    mapId: string;
    players: PlayerInfo[];
}