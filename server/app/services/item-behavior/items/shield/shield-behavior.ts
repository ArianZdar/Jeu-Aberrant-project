import { SHIELD_DEFENSE_BUFF, SHIELD_HP_THRESHOLD } from '@app/constants/server-constants';
import { CombatItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { CombatItemEffectInfo } from '@common/game/item-effect-info';

export class ShieldBehavior implements CombatItemBehavior {
    applyCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo): void {
        if (combatItemEffectInfo.player.healthPower <= SHIELD_HP_THRESHOLD) {
            combatItemEffectInfo.player.buffs.defenseBuff += SHIELD_DEFENSE_BUFF;
            combatItemEffectInfo.player.activeBuffs.push(combatItemEffectInfo.gameItem.item);
        }
    }

    removeCombatItemEffect(combatItemEffectInfo: CombatItemEffectInfo): void {
        combatItemEffectInfo.player.buffs.defenseBuff -= SHIELD_DEFENSE_BUFF;
        combatItemEffectInfo.player.activeBuffs = combatItemEffectInfo.player.activeBuffs.filter(
            (item) => item !== combatItemEffectInfo.gameItem.item,
        );
    }
}
