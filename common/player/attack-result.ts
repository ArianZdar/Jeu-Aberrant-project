import { Player } from './player';

export interface AttackResult {
    attacker: Player; 
    target: Player; 
    attackValue: number; 
    defenseValue: number;
}