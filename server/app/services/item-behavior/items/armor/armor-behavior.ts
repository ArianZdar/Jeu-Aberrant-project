import { ARMOR_DEFENSE_BUFF, ARMOR_SPEED_DEBUFF } from '@app/constants/server-constants';
import { PassiveItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';

export class ArmorBehavior implements PassiveItemBehavior {
    applyPassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        passiveItemEffectInfo.player.buffs.defenseBuff += ARMOR_DEFENSE_BUFF;
        passiveItemEffectInfo.player.speed =
            passiveItemEffectInfo.player.speed >= ARMOR_SPEED_DEBUFF ? passiveItemEffectInfo.player.speed - ARMOR_SPEED_DEBUFF : 0;
        passiveItemEffectInfo.player.maxSpeed -= ARMOR_SPEED_DEBUFF;

        passiveItemEffectInfo.player.activeBuffs.push(passiveItemEffectInfo.gameItem.item);
    }

    removePassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        passiveItemEffectInfo.player.buffs.defenseBuff -= ARMOR_DEFENSE_BUFF;
        passiveItemEffectInfo.player.speed += ARMOR_SPEED_DEBUFF;
        passiveItemEffectInfo.player.maxSpeed += ARMOR_SPEED_DEBUFF;

        passiveItemEffectInfo.player.activeBuffs = passiveItemEffectInfo.player.activeBuffs.filter(
            (item) => item !== passiveItemEffectInfo.gameItem.item,
        );
    }
}
