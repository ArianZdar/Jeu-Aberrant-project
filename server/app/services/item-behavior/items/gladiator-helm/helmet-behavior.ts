import { CombatEndItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { CombatEndItemEffectInfo } from '@common/game/item-effect-info';

export class GladiatorHelm implements CombatEndItemBehavior {
    applyCombatEndItemEffect(combatEndItemEffectInfo: CombatEndItemEffectInfo): void {
        if (combatEndItemEffectInfo.itemHolder.healthPower > 0) {
            combatEndItemEffectInfo.itemHolder.actionPoints = combatEndItemEffectInfo.itemHolder.maxActionPoints;
        }
    }
}
