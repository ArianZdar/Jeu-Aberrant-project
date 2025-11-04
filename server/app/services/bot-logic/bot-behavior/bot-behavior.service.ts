import { ATTACK_DELAY_FOR_BOTS, BotBehaviorContext } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Coordinate } from '@app/model/schema/game-item.schema';
import { BotCombatService } from '@app/services/bot-logic/bot-combat/bot-combat.service';
import { BotItemService } from '@app/services/bot-logic/bot-item/bot-item.service';
import { BotMovementService } from '@app/services/bot-logic/bot-movement/bot-movement.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { GameModes } from '@common/game/game-enums';
import { Player } from '@common/player/player';
import { Inject, Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { BotUtilsService } from '@app/services/bot-logic/bot-utils/bot-utils.service';

@Injectable()
export class BotBehaviorService {
    @Inject() private readonly gameManagerService: GameManagerService;
    private server: Server;

    constructor(
        private turnLogicService: TurnLogicService,
        private botCombatService: BotCombatService,
        private botMovementService: BotMovementService,
        private botItemService: BotItemService,
        private botUtilsService: BotUtilsService,
    ) {}

    setServer(server: Server): void {
        this.server = server;
        this.botCombatService.setServer(server);
        this.botMovementService.setServer(server);
    }

    botBehavior(game: Game, bot: Player): void {
        const enemies = this.botUtilsService.getAliveEnemies(game, bot);
        const closestItem = this.botItemService.findClosestItemByCategory(game, bot);
        const closestEnemy = this.botCombatService.findClosestEnemy(game, bot, enemies);

        if (!closestItem && !closestEnemy) {
            return;
        }

        if (!bot.isTurn) {
            return;
        }

        if (bot.isInCombat) {
            return;
        }

        if (game.gameMode === GameModes.CTF) {
            this.ctfBotBehavior(game, bot, enemies);
        } else {
            this.defaultBotBehavior(game, bot, enemies);
        }
    }

    private async ctfBotBehavior(game: Game, bot: Player, enemies: Player[]): Promise<void> {
        const enemyWhoHaveFlag = enemies.find((enemy) => enemy.hasFlag);
        const flagPosition = this.botItemService.findFlagPosition(game);

        let shouldCallBotBehavior = true;
        if (flagPosition) {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, flagPosition, false);
        } else if (bot.hasFlag) {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, bot.spawnPointPosition, false);
        } else if (!bot.hasFlag && enemyWhoHaveFlag) {
            if (bot.isAggressive) {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, enemyWhoHaveFlag.position, false);
            } else {
                if (this.botMovementService.isSamePosition(enemyWhoHaveFlag.spawnPointPosition, bot.position) && !bot.isInCombat) {
                    this.turnLogicService.endBotTurn(game.id);
                    return;
                }
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, enemyWhoHaveFlag.spawnPointPosition, false);
            }
        } else {
            this.defaultBotBehavior(game, bot, enemies);
            return;
        }

        if (shouldCallBotBehavior) {
            setTimeout(() => {
                this.botBehavior(game, bot);
            }, ATTACK_DELAY_FOR_BOTS);
        }
    }

    private async moveAndAttackEnemy(
        game: Game,
        bot: Player,
        enemies: Player[],
        target: Coordinate,
        comingFromDefaultBotBehavior: boolean,
    ): Promise<boolean> {
        this.botCombatService.attackEnemy(game, bot, enemies);
        return new Promise((resolve) => {
            setTimeout(() => {
                if (!bot.isInCombat) {
                    const result = this.botMovementService.moveTowardsTargetAndShouldRecallBotBehavior(
                        game,
                        bot,
                        target,
                        comingFromDefaultBotBehavior,
                    );
                    resolve(result);
                } else {
                    resolve(false);
                }
            }, ATTACK_DELAY_FOR_BOTS);
        });
    }

    private defaultBotBehavior(game: Game, bot: Player, enemies: Player[]): void {
        const accessibleTiles = this.gameManagerService.getAccessibleTileForPlayer(game.id, bot._id);
        const closestItem = this.botItemService.findClosestItemByCategory(game, bot);
        const closestEnemy = this.botCombatService.findClosestEnemy(game, bot, enemies);

        const itemInRange = closestItem && this.botMovementService.isPositionInAccessibleTiles(closestItem.position, accessibleTiles);

        let enemyInRange = false;
        for (const tile of accessibleTiles) {
            if (this.botUtilsService.canAttackEnemyFromThatTile(tile, closestEnemy)) {
                enemyInRange = true;
                break;
            }
        }

        const botBehaviorContext: BotBehaviorContext = {
            game,
            bot,
            enemies,
            closestEnemy,
            closestItem,
            itemInRange,
            enemyInRange,
        };

        if (bot.isAggressive) {
            this.handleAggressiveBotBehavior(botBehaviorContext);
        } else {
            this.handleDefensiveBotBehavior(botBehaviorContext);
        }
    }

    private async handleAggressiveBotBehavior(botBehaviorContext: BotBehaviorContext): Promise<void> {
        const { game, bot, enemies, closestEnemy, closestItem, itemInRange, enemyInRange } = botBehaviorContext;

        let shouldCallBotBehavior = false;

        if (enemyInRange) {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
        } else if (itemInRange && !enemyInRange) {
            if (bot.items.length >= 2) {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
            } else {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestItem.position, true);
            }
        } else if (!itemInRange && !enemyInRange && !this.botCombatService.tryToAttackEnemy(game, bot, enemies)) {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
        } else {
            this.botCombatService.attackEnemy(game, bot, enemies);
        }

        if (shouldCallBotBehavior) {
            setTimeout(() => {
                this.botBehavior(game, bot);
            }, ATTACK_DELAY_FOR_BOTS);
        }
    }

    private async handleDefensiveBotBehavior(botBehaviorContext: BotBehaviorContext): Promise<void> {
        const { game, bot, enemies, closestEnemy, closestItem, itemInRange, enemyInRange } = botBehaviorContext;

        let shouldCallBotBehavior = false;

        if (!itemInRange && enemyInRange) {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
        } else if (itemInRange) {
            if (bot.items.length >= 2) {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
            } else {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestItem.position, true);
            }
        } else if (closestItem) {
            if (bot.items.length >= 2) {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
            } else {
                shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestItem.position, true);
            }
        } else {
            shouldCallBotBehavior = await this.moveAndAttackEnemy(game, bot, enemies, closestEnemy.position, true);
        }

        if (shouldCallBotBehavior) {
            setTimeout(() => {
                this.botBehavior(game, bot);
            }, ATTACK_DELAY_FOR_BOTS);
        }
    }
}
