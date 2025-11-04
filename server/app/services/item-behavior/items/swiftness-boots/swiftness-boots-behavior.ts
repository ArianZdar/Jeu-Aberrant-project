import { SWIFTNESS_BOOTS_HEALTH_DEBUFF, SWIFTNESS_BOOTS_SPEED_BUFF } from '@app/constants/server-constants';
import { PassiveItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';

export class SwiftnessBootsBehavior implements PassiveItemBehavior {
    applyPassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        passiveItemEffectInfo.player.speed += SWIFTNESS_BOOTS_SPEED_BUFF;
        passiveItemEffectInfo.player.maxSpeed += SWIFTNESS_BOOTS_SPEED_BUFF;

        passiveItemEffectInfo.player.healthPower =
            passiveItemEffectInfo.player.healthPower >= SWIFTNESS_BOOTS_HEALTH_DEBUFF
                ? passiveItemEffectInfo.player.healthPower - SWIFTNESS_BOOTS_HEALTH_DEBUFF
                : 0;
        passiveItemEffectInfo.player.maxHealthPower -= SWIFTNESS_BOOTS_HEALTH_DEBUFF;

        passiveItemEffectInfo.player.activeBuffs.push(passiveItemEffectInfo.gameItem.item);
    }

    removePassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        const newSpeed = passiveItemEffectInfo.player.speed - SWIFTNESS_BOOTS_SPEED_BUFF;
        passiveItemEffectInfo.player.speed = Math.max(newSpeed, 0);
        passiveItemEffectInfo.player.maxSpeed -= SWIFTNESS_BOOTS_SPEED_BUFF;
        passiveItemEffectInfo.player.maxHealthPower += SWIFTNESS_BOOTS_HEALTH_DEBUFF;
        passiveItemEffectInfo.player.healthPower += SWIFTNESS_BOOTS_HEALTH_DEBUFF;

        passiveItemEffectInfo.player.activeBuffs = passiveItemEffectInfo.player.activeBuffs.filter(
            (item) => item !== passiveItemEffectInfo.gameItem.item,
        );
    }
}
