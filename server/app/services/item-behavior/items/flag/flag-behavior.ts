import { PassiveItemBehavior } from '@app/services/item-behavior/items/item-behavior';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';

export class FlagBehavior implements PassiveItemBehavior {
    applyPassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        passiveItemEffectInfo.player.hasFlag = true;
        passiveItemEffectInfo.player.activeBuffs.push(passiveItemEffectInfo.gameItem.item);
    }

    removePassiveItemEffect(passiveItemEffectInfo: PassiveItemEffectInfo): void {
        passiveItemEffectInfo.player.hasFlag = false;
        passiveItemEffectInfo.player.activeBuffs = passiveItemEffectInfo.player.activeBuffs.filter(
            (item) => item !== passiveItemEffectInfo.gameItem.item,
        );
    }
}
