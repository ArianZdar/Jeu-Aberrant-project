import { GameModes } from '@common/game/game-enums';
import { Tile } from '@common/game/game-info';
import { GameItem } from '@common/grid/grid-state';

export interface GridStateConfig {
    title: string;
    description: string;
    gridData: Tile[][];
    originalGridData: Tile[][];
    originalItems: GameItem[];
    size: string;
    gameMode: GameModes;
}

export interface Tool {
    type: string;
    image: string;
    description: string;
    isActive: boolean;
    nameDisplay: string;
}

export enum DiceType {
    Four = 4,
    Six = 6,
}

export interface MainPlayerInfos {
    username: string;
    champion: string;
    maxHealth: number;
    health: number;
    speed: number;
    attack: number;
    attackDice: DiceType;
    defense: number;
    defenseDice: DiceType;
    movementPoints: number;
    maxActionPoints: number;
    actionPoints: number;
}

export interface TilePosition {
    x: number;
    y: number;
    tileType: string;
}

export interface CombatData {
    attackerId: string;
    targetId: string;
    damage: number;
    isAttackerDebuffed?: boolean;
    isTargetDebuffed?: boolean;
}
