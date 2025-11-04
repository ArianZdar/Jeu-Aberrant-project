import { Lobby } from '../lobby/lobby-info';
import { Coordinate } from '../game/game-info';

export interface CreateGameInterface {
    mapId: string;
    maxPlayers: number;
    isLocked: boolean;
}

export interface ChampionSelectedInterface {
    index: number; 
    oldIndex?: number
}

export interface JoinLobbyResponseInterface {
    hasJoinedLobby: boolean; 
    lobby: Lobby;
}

export interface BotStartCombatInterface {
    botId: string; 
    targetId: string
}

export interface PlayerAttackInterface {
    isAnAutoAttack: boolean; 
    targetId: string
}

export interface TurnInterface {
    gameId: string; 
    playerId: string;
}

export interface GetShortestPathToTileInterface {
    gameId: string; 
    playerId: string; 
    destination: Coordinate;
}

export interface RebindSocketIdInterface {
    lobbySocketId: string; 
    gameSocketId: string;
}

