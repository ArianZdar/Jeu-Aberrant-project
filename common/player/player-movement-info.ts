import { Coordinate } from '../game/game-info';
import { Player } from './player';

export interface PlayerMovementInfo {
    gameId: string;
    movingPlayerId: string;
    sourcePosition: Coordinate;
    targetPosition: Coordinate;
    isTeleporting?: boolean;
}

export interface MovementData {
    players: Player[];
    playerId: string;
    path: Coordinate[];
    isEndingOnItem: boolean;
}
