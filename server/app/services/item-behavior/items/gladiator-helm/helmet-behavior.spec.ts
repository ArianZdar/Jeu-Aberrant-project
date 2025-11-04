/* eslint-disable @typescript-eslint/no-magic-numbers */

import { GladiatorHelm } from '@app/services/item-behavior/items/gladiator-helm/helmet-behavior';
import { CombatEndItemEffectInfo } from '@common/game/item-effect-info';

describe('GladiatorHelm', () => {
    let gladiatorHelm: GladiatorHelm;
    let combatEndItemEffectInfo: CombatEndItemEffectInfo;

    beforeEach(() => {
        gladiatorHelm = new GladiatorHelm();
        combatEndItemEffectInfo = {
            itemHolder: {
                healthPower: 6,
                actionPoints: 1,
                maxActionPoints: 1,
            },
        } as CombatEndItemEffectInfo;
    });

    describe('applyCombatEndItemEffect', () => {
        it('should reset actionPoints to maxActionPoints when healthPower is positive', () => {
            gladiatorHelm.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(combatEndItemEffectInfo.itemHolder.actionPoints).toBe(combatEndItemEffectInfo.itemHolder.maxActionPoints);
        });

        it('should not change actionPoints when healthPower is zero', () => {
            combatEndItemEffectInfo.itemHolder.healthPower = 0;
            combatEndItemEffectInfo.itemHolder.actionPoints = 5;
            gladiatorHelm.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(combatEndItemEffectInfo.itemHolder.actionPoints).toBe(5);
        });

        it('should not change actionPoints when healthPower is negative', () => {
            combatEndItemEffectInfo.itemHolder.healthPower = -10;
            combatEndItemEffectInfo.itemHolder.actionPoints = 3;
            gladiatorHelm.applyCombatEndItemEffect(combatEndItemEffectInfo);
            expect(combatEndItemEffectInfo.itemHolder.actionPoints).toBe(3);
        });
    });
});
