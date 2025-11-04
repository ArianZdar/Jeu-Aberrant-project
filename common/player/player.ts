import { GameObjects, Teams } from '../game/game-enums';
import { Coordinate } from '../game/game-info';
import { GameItem } from '../grid/grid-state';
import { PlayerBuffs } from './player-buffs';

export interface Player {
    _id: string;

    name: string;
    championName: string;

    healthPower: number;
    maxHealthPower: number;
    attackPower: number;
    defensePower: number;
    speed: number;
    maxSpeed: number;
    actionPoints: number;
    maxActionPoints: number;

    position: Coordinate;
    spawnPointPosition: Coordinate;

    isWinner: boolean;
    isBot: boolean;
    isAggressive: boolean;
    isLeader: boolean;
    isTurn: boolean;
    isConnected: boolean;
    nbFightsWon: number;
    isCombatTurn: boolean;
    escapesAttempts: number;

    team: Teams;
    hasFlag: boolean;
    isInCombat: boolean;

    items: GameItem[];
    buffs: PlayerBuffs;
    activeBuffs: GameObjects[];
}

export const MAX_ITEMS_PER_PLAYER = 2;
