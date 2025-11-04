import { Game } from '@app/model/class/game/game';
import { GameItem } from '../grid/grid-state';
import { Player } from '../player/player';

export interface PassiveItemEffectInfo {
    gameItem: GameItem;
    player: Player;
}

export interface CombatItemEffectInfo {
    gameItem: GameItem;
    player: Player;
}

export interface CombatEndItemEffectInfo {
    gameItem: GameItem;
    itemHolder: Player;
    opposingPlayer: Player;
    game?: Game;
}
