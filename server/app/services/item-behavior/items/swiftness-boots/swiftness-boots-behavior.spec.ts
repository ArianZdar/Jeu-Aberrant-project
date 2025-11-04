import { SWIFTNESS_BOOTS_HEALTH_DEBUFF, SWIFTNESS_BOOTS_SPEED_BUFF } from '@app/constants/server-constants';
import { mockGameItem } from '@app/constants/server-mocks';
import { GameItem } from '@app/model/schema/game-item.schema';
import { GameObjects } from '@common/game/game-enums';
import { PassiveItemEffectInfo } from '@common/game/item-effect-info';
import { mockPlayers } from '@common/player/mock-player';
import { Player } from '@common/player/player';
import { SwiftnessBootsBehavior } from './swiftness-boots-behavior';

describe('SwiftnessBootsBehavior', () => {
    let swiftnessBootsBehavior: SwiftnessBootsBehavior;
    let mockItem: GameItem;
    let mockPlayer: Player;
    let passiveItemEffectInfo: PassiveItemEffectInfo;

    beforeEach(() => {
        swiftnessBootsBehavior = new SwiftnessBootsBehavior();
        mockItem = { ...mockGameItem };
        mockPlayer = { ...mockPlayers[0] };

        passiveItemEffectInfo = {
            gameItem: mockItem,
            player: mockPlayer,
        };
    });

    describe('applyPassiveItemEffect', () => {
        it('should apply speed buff and health debuff correctly when healthPower is sufficient', () => {
            const initialSpeed = mockPlayer.speed;
            const initialMaxSpeed = mockPlayer.maxSpeed;
            const initialHealthPower = mockPlayer.healthPower;
            const initialMaxHealthPower = mockPlayer.maxHealthPower;

            swiftnessBootsBehavior.applyPassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.speed).toBe(initialSpeed + SWIFTNESS_BOOTS_SPEED_BUFF);
            expect(passiveItemEffectInfo.player.maxSpeed).toBe(initialMaxSpeed + SWIFTNESS_BOOTS_SPEED_BUFF);

            expect(passiveItemEffectInfo.player.healthPower).toBe(initialHealthPower - SWIFTNESS_BOOTS_HEALTH_DEBUFF);
            expect(passiveItemEffectInfo.player.maxHealthPower).toBe(initialMaxHealthPower - SWIFTNESS_BOOTS_HEALTH_DEBUFF);

            expect(passiveItemEffectInfo.player.activeBuffs).toContain(mockItem.item);
        });

        it('should not reduce healthPower below 0', () => {
            passiveItemEffectInfo.player.healthPower = SWIFTNESS_BOOTS_HEALTH_DEBUFF - 1;
            swiftnessBootsBehavior.applyPassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.healthPower).toBe(0);
        });
    });

    describe('removePassiveItemEffect', () => {
        it('should remove speed buff and restore health values correctly', () => {
            passiveItemEffectInfo.player.activeBuffs = [mockItem.item];
            passiveItemEffectInfo.player.speed += SWIFTNESS_BOOTS_SPEED_BUFF;
            passiveItemEffectInfo.player.maxSpeed += SWIFTNESS_BOOTS_SPEED_BUFF;
            passiveItemEffectInfo.player.healthPower = Math.max(passiveItemEffectInfo.player.healthPower - SWIFTNESS_BOOTS_HEALTH_DEBUFF, 0);
            passiveItemEffectInfo.player.maxHealthPower -= SWIFTNESS_BOOTS_HEALTH_DEBUFF;

            const currentSpeed = passiveItemEffectInfo.player.speed;
            const currentMaxSpeed = passiveItemEffectInfo.player.maxSpeed;
            const currentHealthPower = passiveItemEffectInfo.player.healthPower;
            const currentMaxHealthPower = passiveItemEffectInfo.player.maxHealthPower;

            swiftnessBootsBehavior.removePassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.speed).toBe(currentSpeed - SWIFTNESS_BOOTS_SPEED_BUFF);
            expect(passiveItemEffectInfo.player.maxSpeed).toBe(currentMaxSpeed - SWIFTNESS_BOOTS_SPEED_BUFF);
            expect(passiveItemEffectInfo.player.healthPower).toBe(currentHealthPower + SWIFTNESS_BOOTS_HEALTH_DEBUFF);
            expect(passiveItemEffectInfo.player.maxHealthPower).toBe(currentMaxHealthPower + SWIFTNESS_BOOTS_HEALTH_DEBUFF);

            expect(passiveItemEffectInfo.player.activeBuffs).not.toContain(mockItem.item);
        });

        it('should not remove other items from activeBuffs', () => {
            passiveItemEffectInfo.player.activeBuffs = [mockItem.item, GameObjects.SwiftnessBoots];
            swiftnessBootsBehavior.removePassiveItemEffect(passiveItemEffectInfo);

            expect(passiveItemEffectInfo.player.activeBuffs).toContain(GameObjects.SwiftnessBoots);
        });
    });
});
