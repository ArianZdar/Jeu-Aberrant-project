import { GameObjects } from '@common/game/game-enums';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';
import { FlagBehavior } from './flag-behavior';

describe('FlagBehavior', () => {
    let flagBehavior: FlagBehavior;
    let passiveItemEffectInfo: PassiveItemEffectInfo;

    beforeEach(() => {
        flagBehavior = new FlagBehavior();
        passiveItemEffectInfo = {
            gameItem: { position: { x: 0, y: 0 }, item: GameObjects.Flag },
            player: { hasFlag: false, activeBuffs: [] },
        } as PassiveItemEffectInfo;
    });

    describe('applyPassiveItemEffect', () => {
        it('should set hasFlag to true', () => {
            flagBehavior.applyPassiveItemEffect(passiveItemEffectInfo);
            expect(passiveItemEffectInfo.player.hasFlag).toBe(true);
        });
    });

    describe('removePassiveItemEffect', () => {
        it('should set hasFlag to false and remove the flag buff', () => {
            passiveItemEffectInfo.player.activeBuffs = [GameObjects.Flag];
            passiveItemEffectInfo.player.hasFlag = true;
            flagBehavior.removePassiveItemEffect(passiveItemEffectInfo);
            expect(passiveItemEffectInfo.player.hasFlag).toBe(false);
        });
    });
});
