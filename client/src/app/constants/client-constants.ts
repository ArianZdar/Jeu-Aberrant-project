import { GameObjects } from '@common/game/game-enums';

export const THUMBNAIL_TILE_SIZE = 150;

export const TILE_IMAGE_URLS: { [key: string]: string } = {
    grass: './assets/grass.png',
    grasslighter: './assets/grasslighter.png',
    water: './assets/water.png',
    ice: './assets/ice.png',
    wall: './assets/wall.png',
    stone: './assets/wall.png',
    door: './assets/door.png',
    openDoor: './assets/open_door.png',
    default: './assets/grass.png',
};

export const OBJECT_IMAGE_URLS: { [key: string]: string } = {
    spawnPoint: 'assets/spawnpoint.png',
};

export const SIZE_DISPLAY_MAP = new Map<string, string>([
    ['small', 'Petit (10x10)'],
    ['medium', 'Moyen (15x15)'],
    ['large', 'Large (20x20)'],
]);

export const SMALL_GRID_SIZE = 10;
export const MEDIUM_GRID_SIZE = 15;
export const LARGE_GRID_SIZE = 20;

export const SIZE_TO_STRING = new Map<number, string>([
    [SMALL_GRID_SIZE, 'small'],
    [MEDIUM_GRID_SIZE, 'medium'],
    [LARGE_GRID_SIZE, 'large'],
]);

export const TITLE_MAX_LENGTH = 30;
export const MAX_THUMBNAIL_WIDTH = 300;
export const MAX_THUMBNAIL_HEIGHT = 300;
export const DESCRIPTION_MAX_LENGTH = 70;

export const SMALL_GRID_INFO = { size: 10, numberOfPlaceable: 2 };
export const MEDIUM_GRID_INFO = { size: 15, numberOfPlaceable: 4 };
export const LARGE_GRID_INFO = { size: 20, numberOfPlaceable: 6 };

export const GRID_INFO_MAP = new Map([
    [SMALL_GRID_INFO.size, SMALL_GRID_INFO],
    [MEDIUM_GRID_INFO.size, MEDIUM_GRID_INFO],
    [LARGE_GRID_INFO.size, LARGE_GRID_INFO],
]);

export const SIZE_MAP = new Map([
    ['small', { size: SMALL_GRID_INFO.size, randomItems: SMALL_GRID_INFO.numberOfPlaceable }],
    ['medium', { size: MEDIUM_GRID_INFO.size, randomItems: MEDIUM_GRID_INFO.numberOfPlaceable }],
    ['large', { size: LARGE_GRID_INFO.size, randomItems: LARGE_GRID_INFO.numberOfPlaceable }],
]);

export enum MouseClicks {
    Left = 0,
    Middle = 1,
    Right = 2,
}

export const NON_EXISTANT_GAME_ID = '-1';

export const TILE_DESCRIPTION_MAP = new Map([
    ['./assets/grass.png', { name: 'Gazon', description: 'Case de base\n Coût = 1' }],
    ['./assets/grasslighter.png', { name: 'Gazon clair', description: 'Case de base\n Coût = 1' }],
    ['./assets/water.png', { name: 'Eau', description: 'Ralenti le joueur\n Coût = 2' }],
    ['./assets/ice.png', { name: 'Glace', description: 'Affaibli le joueur de 2 DEF/ATK\n Coût = 0' }],
    ['./assets/wall.png', { name: 'Mur', description: 'Bloque le passage' }],
    ['./assets/door.png', { name: 'Porte (fermée)', description: 'Bloque le passage' }],
    ['./assets/open_door.png', { name: 'Porte (ouverte)', description: 'Permet le passage\n Coût = 1' }],
]);

export const TILES_TOOLBAR_TOOLTIPS = [
    {
        type: 'water',
        image: './assets/water.png',
        description: 'Ralenti le joueur\n Coût = 2',
        isActive: false,
        nameDisplay: 'Eau',
    },
    {
        type: 'ice',
        image: './assets/ice.png',
        description: 'Affaibli le joueur de 2 DEF/ATK\n Coût = 0',
        isActive: false,
        nameDisplay: 'Glace',
    },
    {
        type: 'wall',
        image: './assets/wall.png',
        description: 'Bloque le passage',
        isActive: false,
        nameDisplay: 'Mur',
    },
    {
        type: 'door',
        image: './assets/door.png',
        description: "Bloque le passage. Peut être ouverte pour 1 point d'action",
        isActive: false,
        nameDisplay: 'Porte',
    },
];

export const ITEM_IMAGE_MAP: Record<GameObjects, string> = {
    [GameObjects.None]: '',
    [GameObjects.Spawnpoint]: './assets/spawnpoint.png',
    [GameObjects.Flag]: './assets/flag_purple.png',
    [GameObjects.RandomItem]: './assets/dices.png',
    [GameObjects.SwiftnessBoots]: './assets/items/boots.png',
    [GameObjects.Armor]: './assets/items/armor.png',
    [GameObjects.Shield]: './assets/items/shield.png',
    [GameObjects.GladiatorHelm]: './assets/items/helmet.png',
    [GameObjects.Bomb]: './assets/items/bomb.png',
    [GameObjects.Pickaxe]: './assets/items/pickaxe.png',
};

export const ITEM_DISPLAY_NAMES: Record<GameObjects, string> = {
    [GameObjects.None]: '',
    [GameObjects.Spawnpoint]: 'Point de départ',
    [GameObjects.Flag]: 'Drapeau',
    [GameObjects.RandomItem]: 'Item aléatoire',
    [GameObjects.SwiftnessBoots]: 'Bottes de vitesse',
    [GameObjects.Armor]: 'Armure',
    [GameObjects.Shield]: 'Bouclier',
    [GameObjects.GladiatorHelm]: 'Casque Gladiateur',
    [GameObjects.Bomb]: 'Bombe',
    [GameObjects.Pickaxe]: 'Pioche',
};

export const ITEM_DESCRIPTION_MAP: Record<GameObjects, string> = {
    [GameObjects.None]: '',
    [GameObjects.Spawnpoint]: 'Un joueur commencera la partie ici',
    [GameObjects.Flag]: 'Cet item doit être ramené à votre point de départ afin de remporter la partie',
    [GameObjects.RandomItem]: 'Se transforme en un item aléatoire au début de la partie',
    [GameObjects.SwiftnessBoots]: '+2 VIT, -1 PV',
    [GameObjects.Armor]: '+2 DEF, -2 VIT',
    [GameObjects.Shield]: '+2 DEF lorsque PV < 2',
    [GameObjects.GladiatorHelm]: "Gagner un combat récupère 1 point d'action",
    [GameObjects.Bomb]: "Lorsque vous perdez un combat, renvoie l'adversaire à son point de départ",
    [GameObjects.Pickaxe]: "Débloque l'abilité de briser un mur pour 1 point d'action",
};

export const ITEMS_TOOLBAR_TOOLTIPS = [
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.SwiftnessBoots],
        image: ITEM_IMAGE_MAP[GameObjects.SwiftnessBoots],
        description: ITEM_DESCRIPTION_MAP[GameObjects.SwiftnessBoots],
        item: GameObjects.SwiftnessBoots,
    },
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.Armor],
        image: ITEM_IMAGE_MAP[GameObjects.Armor],
        description: ITEM_DESCRIPTION_MAP[GameObjects.Armor],
        item: GameObjects.Armor,
    },
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.Shield],
        image: ITEM_IMAGE_MAP[GameObjects.Shield],
        description: ITEM_DESCRIPTION_MAP[GameObjects.Shield],
        item: GameObjects.Shield,
    },
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.GladiatorHelm],
        image: ITEM_IMAGE_MAP[GameObjects.GladiatorHelm],
        description: ITEM_DESCRIPTION_MAP[GameObjects.GladiatorHelm],
        item: GameObjects.GladiatorHelm,
    },
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.Bomb],
        image: ITEM_IMAGE_MAP[GameObjects.Bomb],
        description: ITEM_DESCRIPTION_MAP[GameObjects.Bomb],
        item: GameObjects.Bomb,
    },
    {
        name: ITEM_DISPLAY_NAMES[GameObjects.Pickaxe],
        image: ITEM_IMAGE_MAP[GameObjects.Pickaxe],
        description: ITEM_DESCRIPTION_MAP[GameObjects.Pickaxe],
        item: GameObjects.Pickaxe,
    },
];

export interface RoomData {
    pin: string;
    userId?: string;
}

export enum Pages {
    GameCreation = 'gameCreation',
    ChampSelect = 'champSelect',
}

export enum PowerType {
    Health = 'health',
    Speed = 'speed',
}

export enum ChampSelectEvents {
    SubmitChampSelect = 'submitChampSelect',
    ChampSelectSubmitted = 'champSelectSubmitted',
    ChampSelectError = 'champSelectError',
}

export const CODE_LENGTH = 4;

export const MOUSE_OFFSET_SCALE = 10;

export const CENTER_RATIO = 0.5;

export const BONUS_POINTS = 2;
export const POINTS_PER_POWER = 2;

export const DICE_4 = 4;
export const DICE_6 = 6;
export const MIN_POWER = 4;
export const MAX_POWER = 6;
export const MAX_NAME_LENGTH = 12;
export const MIN_ACTIONS = 1;

export const ITEM_TIMEOUT = 50;

export const TILE_CENTER_OFFSET = 0.5;
export const DELAY_CHECKMARK = 500;

export const TURN_TIMER = 30;
export const TRANSITION_DELAY_IN_SECOND = 3;
export const TRANSITION_DELAY_IN_MS = 3000;
export const MS_OF_ONE_SECOND = 1000;
export const MS_OF_ONE_AND_HALF_SECOND = 1500;
export const CRITICAL_TIMER = 10;
export const MOVEMENT_DELAY_MS = 150;
export const DAMAGE_ANIMATION_DURATION = 500;
export const VALUE_DISPLAY_DURATION = 1500;
export const COMBAT_END_DELAY = 3000;

export const PROGRESS_MAX_VALUE = 100;
export const PROGRESS_HIGH_THRESHOLD = 66;
export const PROGRESS_LOW_THRESHOLD = 33;
export const PROGRESS_HIGH_RANGE = 34;
export const PROGRESS_LOW_RANGE = 33;

export const WOOD_COLOR = { r: 181, g: 136, b: 99 };
export const ORANGE_COLOR = { r: 224, g: 157, b: 61 };
export const RED_COLOR = { r: 213, g: 57, b: 57 };

export const MESSAGE_HOVER_MARGIN = 100;

export const WORD_MAX_LENGTH = 200;
export const FAKE_HUMAN_DELAY = 3000;
export const MIN_ATTACK_DELAY = 1000;
