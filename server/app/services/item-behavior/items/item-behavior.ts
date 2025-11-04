import { CombatEndItemEffectInfo, CombatItemEffectInfo, PassiveItemEffectInfo } from '@common/game/item-effect-info';

export interface ItemBehavior {
    applyPassiveItemEffect?(passiveItemEffectInfo: PassiveItemEffectInfo): void;
    removePassiveItemEffect?(passiveItemEffectInfo: PassiveItemEffectInfo): void;
    applyCombatItemEffect?(combatItemEffectInfo: CombatItemEffectInfo): void;
    applyCombatEndItemEffect?(combatEndItemEffectInfo: CombatEndItemEffectInfo): void;
}

export interface PassiveItemBehavior extends ItemBehavior {
    applyPassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void;
    removePassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void;
}

export interface CombatItemBehavior extends ItemBehavior {
    applyCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo): void;
    removeCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo): void;
}

export interface CombatEndItemBehavior extends ItemBehavior {
    applyCombatEndItemEffect(combatEndItemEffectInfo: CombatEndItemEffectInfo): void;
}
