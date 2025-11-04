import { PlayerInfo } from '../player/player-info';

export class Lobby {
    locked: boolean;
    maxPlayers: number;
    code: string;
    players: PlayerInfo[];
    mapId: string;
}
