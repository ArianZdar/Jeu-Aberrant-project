import { SHIELD_DEFENSE_BUFF, SHIELD_HP_THRESHOLD } from '@app/constants/server-constants';
import { mockGameItem } from '@app/constants/server-mocks';
import { GameItem } from '@app/model/schema/game-item.schema';
import { GameObjects } from '@common/game/game-enums';
import { CombatItemEffectInfo } from '@common/game/item-effect-info';
import { mockPlayers } from '@common/player/mock-player';
import { ShieldBehavior } from './shield-behavior';

describe('ShieldBehavior', () => {
    let shieldBehavior: ShieldBehavior;
    let combatItemEffectInfo: CombatItemEffectInfo;
    let mockShieldItem: GameItem;

    beforeEach(() => {
        shieldBehavior = new ShieldBehavior();
        mockShieldItem = { ...mockGameItem, item: GameObjects.Shield };
        combatItemEffectInfo = {
            gameItem: mockShieldItem,
            player: { ...mockPlayers[0] },
        };
    });

    describe('applyCombatItemEffect', () => {
        it('should apply shield effect when healthPower is less than or equal to threshold', () => {
            combatItemEffectInfo.player.healthPower = SHIELD_HP_THRESHOLD;

            const initialDefenseBuff = combatItemEffectInfo.player.buffs.defenseBuff;

            shieldBehavior.applyCombatItemEffect(combatItemEffectInfo);
            expect(combatItemEffectInfo.player.buffs.defenseBuff).toBe(initialDefenseBuff + SHIELD_DEFENSE_BUFF);
            expect(combatItemEffectInfo.player.activeBuffs).toContain(mockShieldItem.item);
        });

        it('should not apply shield effect when healthPower is above threshold', () => {
            const initialDefenseBuff = combatItemEffectInfo.player.buffs.defenseBuff;

            combatItemEffectInfo.player.healthPower = SHIELD_HP_THRESHOLD + 1;
            combatItemEffectInfo.player.activeBuffs = [];

            shieldBehavior.applyCombatItemEffect(combatItemEffectInfo);
            expect(combatItemEffectInfo.player.buffs.defenseBuff).toBe(initialDefenseBuff);
            expect(combatItemEffectInfo.player.activeBuffs).not.toContain(mockShieldItem.item);
        });
    });

    describe('removeCombatItemEffect', () => {
        it('should remove shield effect from player', () => {
            const initialDefenseBuff = combatItemEffectInfo.player.buffs.defenseBuff;

            combatItemEffectInfo.player.activeBuffs = [mockGameItem.item];
            combatItemEffectInfo.player.buffs.defenseBuff = initialDefenseBuff + SHIELD_DEFENSE_BUFF;
            shieldBehavior.removeCombatItemEffect(combatItemEffectInfo);

            expect(combatItemEffectInfo.player.buffs.defenseBuff).toBe(initialDefenseBuff);
            expect(combatItemEffectInfo.player.activeBuffs).not.toContain(mockShieldItem.item);
        });

        it('should not remove other items from activeBuffs', () => {
            const otherBuff = GameObjects.SwiftnessBoots;
            combatItemEffectInfo.player.activeBuffs = [mockGameItem.item, otherBuff];
            shieldBehavior.removeCombatItemEffect(combatItemEffectInfo);
            expect(combatItemEffectInfo.player.activeBuffs).toContain(otherBuff);
        });
    });
});
