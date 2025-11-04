import { ARMOR_DEFENSE_BUFF, ARMOR_SPEED_DEBUFF } from '@app/constants/server-constants';
import { mockGameItem } from '@app/constants/server-mocks';
import { GameItem } from '@app/model/schema/game-item.schema';
import { GameObjects } from '@common/game/game-enums';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';
import { mockPlayers } from '@common/player/mock-player';
import { Player } from '@common/player/player';
import { ArmorBehavior } from './armor-behavior';

describe('ArmorBehavior', () => {
    let armorBehavior: ArmorBehavior;
    let mockItem: GameItem;
    let mockPlayer: Player;
    let passiveItemEffectInfo: PassiveItemEffectInfo;

    beforeEach(() => {
        armorBehavior = new ArmorBehavior();
        mockItem = { ...mockGameItem };
        mockPlayer = { ...mockPlayers[0] };

        passiveItemEffectInfo = {
            gameItem: mockItem,
            player: mockPlayer,
        };
    });

    describe('applyPassiveItemEffect', () => {
        it('should apply buffs and debuffs correctly', () => {
            const initialDefenseBuff = mockPlayer.buffs.defenseBuff;
            const initialSpeed = mockPlayer.speed;
            const initialMaxSpeed = mockPlayer.maxSpeed;

            armorBehavior.applyPassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.buffs.defenseBuff).toBe(initialDefenseBuff + ARMOR_DEFENSE_BUFF);
            expect(passiveItemEffectInfo.player.speed).toBe(initialSpeed - ARMOR_SPEED_DEBUFF);
            expect(passiveItemEffectInfo.player.maxSpeed).toBe(initialMaxSpeed - ARMOR_SPEED_DEBUFF);
        });

        it('should not reduce speed below 0', () => {
            passiveItemEffectInfo.player.speed = 1;
            armorBehavior.applyPassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.speed).toBeGreaterThanOrEqual(0);
        });
    });

    describe('removePassiveItemEffect', () => {
        it('should remove buffs and restore speed and maxSpeed', () => {
            passiveItemEffectInfo.player.activeBuffs = [mockItem.item];
            passiveItemEffectInfo.player.buffs.defenseBuff += ARMOR_DEFENSE_BUFF;
            const initialDefense = passiveItemEffectInfo.player.buffs.defenseBuff;
            const initialSpeed = passiveItemEffectInfo.player.speed;
            const initialMaxSpeed = passiveItemEffectInfo.player.maxSpeed;

            armorBehavior.removePassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.buffs.defenseBuff).toBe(initialDefense - ARMOR_DEFENSE_BUFF);
            expect(passiveItemEffectInfo.player.speed).toBe(initialSpeed + ARMOR_SPEED_DEBUFF);
            expect(passiveItemEffectInfo.player.maxSpeed).toBe(initialMaxSpeed + ARMOR_SPEED_DEBUFF);
            expect(passiveItemEffectInfo.player.activeBuffs).not.toContain(mockItem);
        });

        it('should not remove other items from activeBuffs', () => {
            passiveItemEffectInfo.player.activeBuffs = [mockItem.item, GameObjects.SwiftnessBoots];

            armorBehavior.removePassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.activeBuffs).toContain(GameObjects.SwiftnessBoots);
        });
    });
});
