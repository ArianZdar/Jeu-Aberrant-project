import { Game } from '@app/model/class/game/game';
import { ArmorBehavior } from '@app/services/item-behavior/items/armor/armor-behavior';
import { BombBehavior } from '@app/services/item-behavior/items/bomb/bomb-behavior';
import { FlagBehavior } from '@app/services/item-behavior/items/flag/flag-behavior';
import { GladiatorHelm } from '@app/services/item-behavior/items/gladiator-helm/helmet-behavior';
import { ItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { ShieldBehavior } from '@app/services/item-behavior/items/shield/shield-behavior';
import { SwiftnessBootsBehavior } from '@app/services/item-behavior/items/swiftness-boots/swiftness-boots-behavior';
import { GameObjects } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { Player } from '@common/player/player';

export const REQUIRED_SPAWNPOINTS = {
    small: 2,
    medium: 4,
    large: 6,
};

export const TOO_LONG_DESCRIPTION = 500;

export const MAX_ROOMS = 10000;
export const MAX_ROOMS_ID = 9999;
export const ROOM_ID_LENGTH = 4;

export const TURN_TIMER = 30;
export const COMBAT_TIMER = 30;
export const MS_OF_ONE_SECOND = 1000;
export const MS_OF_THIRTY_SECOND = 33500;
export const TRANSITION_DELAY = 3000;
export const ICE_TILE_STAT_DEBUFF = 2;
export const FAKE_HUMAN_DELAY = 3000;
export const TRAVEL_DELAY = 150;

export const CHAMPIONS = [
    {
        name: 'ogre',
        description: 'Description of Champion 1',
        imageUrl: 'assets/champions/ogre.png',
    },
    {
        name: 'beast',
        description: 'Description of Champion 2',
        imageUrl: 'assets/champions/beast.png',
    },
    {
        name: 'blood-knight',
        description: 'Description of Champion 3',
        imageUrl: 'assets/champions/blood-knight.png',
    },
    {
        name: 'emo-hero',
        description: 'Description of Champion 4',
        imageUrl: 'assets/champions/emo-hero.png',
    },
    {
        name: 'fighter',
        description: 'Description of Champion 5',
        imageUrl: 'assets/champions/fighter.png',
    },
    {
        name: 'ghost',
        description: 'Description of Champion 6',
        imageUrl: 'assets/champions/ghost.png',
    },
    {
        name: 'ghost-red',
        description: 'Description of Champion 7',
        imageUrl: 'assets/champions/ghost-red.png',
    },
    {
        name: 'mage',
        description: 'Description of Champion 8',
        imageUrl: 'assets/champions/mage.png',
    },
    {
        name: 'necromancer',
        description: 'Description of Champion 9',
        imageUrl: 'assets/champions/necromancer.png',
    },
    {
        name: 'valkyrie',
        description: 'Description of Champion 10',
        imageUrl: 'assets/champions/valkyrie.png',
    },
    {
        name: 'werewolf',
        description: 'Description of Champion 11',
        imageUrl: 'assets/champions/werewolf.png',
    },
    {
        name: 'wizard',
        description: 'Description of Champion 12',
        imageUrl: 'assets/champions/wizard.png',
    },
];

export const COIN_FLIP_PROBABILITY = 0.5;
export const WORD_MAX_LENGTH = 200;
export const ID_LENGTH = 36;
export const DICE_4 = 4;
export const DICE_6 = 6;
export const MIN_POWER = 4;
export const MAX_POWER = 6;

export const BOT_NAME: string[] = ['Sigmarius', 'bibatelol', 'HellYeah', 'ChatGPT', 'Deepseek', 'Claude 3.7'];

export const VALID_GAME_ITEMS: ReadonlySet<GameObjects> = new Set([
    GameObjects.Armor,
    GameObjects.Bomb,
    GameObjects.GladiatorHelm,
    GameObjects.Pickaxe,
    GameObjects.Shield,
    GameObjects.SwiftnessBoots,
]);

export const ITEM_BEHAVIORS: Record<GameObjects, ItemBehavior | null> = {
    [GameObjects.None]: null,
    [GameObjects.SwiftnessBoots]: new SwiftnessBootsBehavior(),
    [GameObjects.Shield]: new ShieldBehavior(),
    [GameObjects.Armor]: new ArmorBehavior(),
    [GameObjects.GladiatorHelm]: new GladiatorHelm(),
    [GameObjects.Bomb]: new BombBehavior(),
    [GameObjects.Pickaxe]: null,
    [GameObjects.Spawnpoint]: null,
    [GameObjects.Flag]: new FlagBehavior(),
    [GameObjects.RandomItem]: null,
};

export enum ItemCategory {
    Defensive = 'defensive',
    Offensive = 'offensive',
    None = 'none',
    Spawnpoint = 'spawnpoint',
    Flag = 'flag',
}

export const ITEM_CATEGORY_MAP: Record<GameObjects, ItemCategory> = {
    [GameObjects.None]: ItemCategory.None,
    [GameObjects.Spawnpoint]: ItemCategory.Spawnpoint,
    [GameObjects.Flag]: ItemCategory.Flag,
    [GameObjects.RandomItem]: ItemCategory.None,
    [GameObjects.SwiftnessBoots]: ItemCategory.Offensive,
    [GameObjects.Armor]: ItemCategory.Defensive,
    [GameObjects.Shield]: ItemCategory.Defensive,
    [GameObjects.GladiatorHelm]: ItemCategory.Offensive,
    [GameObjects.Bomb]: ItemCategory.Defensive,
    [GameObjects.Pickaxe]: ItemCategory.Offensive,
};

export const ARMOR_DEFENSE_BUFF = 2;
export const ARMOR_SPEED_DEBUFF = 2;
export const SWIFTNESS_BOOTS_SPEED_BUFF = 2;
export const SWIFTNESS_BOOTS_HEALTH_DEBUFF = 1;
export const SHIELD_HP_THRESHOLD = 2;
export const SHIELD_DEFENSE_BUFF = 2;

export const ATTACK_DELAY_FOR_BOTS = 250;
export interface BotBehaviorContext {
    game: Game;
    bot: Player;
    enemies: Player[];
    closestEnemy: Player;
    closestItem: { position: Coordinate; item: GameObjects } | null;
    itemInRange: boolean;
    enemyInRange: boolean;
}

export const MIN_ITEMS_CTF = 3;
export const MIN_ITEMS_CLASSIC = 2;
export const MIN_PATH_LENGTH = 2;
