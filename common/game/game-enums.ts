export enum GameModes {
    Classic = 'Classique',
    CTF = 'Capture the Flag',
}

export enum GameObjects {
    None = '',
    SwiftnessBoots = 'boots',
    Armor = 'armor',
    Shield = 'shield',
    GladiatorHelm = 'helmet',
    Bomb = 'bomb',
    Pickaxe = 'pickaxe',
    Spawnpoint = 'spawnpoint',
    Flag = 'flag',
    RandomItem = 'randomitem',
}

export const ITEM_LABELS_FR: Record<string, string> = {
    [GameObjects.SwiftnessBoots]: 'des Bottes',
    [GameObjects.Armor]: 'une Armure',
    [GameObjects.Shield]: 'un Bouclier',
    [GameObjects.GladiatorHelm]: 'un Casque de Gladiateur',
    [GameObjects.Bomb]: 'une Bombe',
    [GameObjects.Pickaxe]: 'une Pioche',
    [GameObjects.Flag]: 'le Drapeau',
    [GameObjects.None]: 'rien'
};

export enum Teams {
    None = '',
    BlueSide = 'BlueSide',
    RedSide = 'RedSide',
}

export enum CombatRole {
    Attacker = 'attacker',
    Target = 'target',
}
