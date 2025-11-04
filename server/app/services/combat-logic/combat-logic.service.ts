import { MIN_POWER } from '@app/constants/server-constants';
import { Game } from '@app/model/class/game/game';
import { Coordinate, GameItem } from '@app/model/schema/game-item.schema';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { ItemBehaviorService } from '@app/services/item-behavior/item-behavior-service';
import { TurnLogicService } from '@app/services/turn-logic/turn-logic.service';
import { AttackResult } from '@common/player/attack-result';
import { Teams } from '@common/game/game-enums';
import { NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY } from '@common/game/game-info';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Injectable } from '@nestjs/common';
import { Server } from 'socket.io';
import { TileState } from '@common/grid/grid-state';

@Injectable()
export class CombatLogicService {
    private server: Server;
    private games: Map<string, Game> = new Map();

    constructor(
        private combatTurnLogicService: CombatTurnLogicService,
        private turnLogicService: TurnLogicService,
        private itemBehaviorService: ItemBehaviorService,
        private chatService: ChatService,
    ) {
        this.setBotAttackHandler();
    }

    setServer(server: Server): void {
        this.server = server;
    }

    setGames(games: Map<string, Game>): void {
        this.games = games;
    }

    executeAttack(attacker: Player, target: Player, isAttackerDebuffed: boolean, isTargetDebuffed): AttackResult {
        const attackerPower = attacker.attackPower;
        const targetPower = target.defensePower;

        const attackBonus = Math.floor(Math.random() * attackerPower) + 1 + attacker.buffs.attackBuff;
        const defenseBonus = Math.floor(Math.random() * targetPower) + 1 + target.buffs.defenseBuff;
        let attackDebuff = 0;
        let targetDebuff = 0;

        if (isAttackerDebuffed) {
            attackDebuff = 2;
        }
        if (isTargetDebuffed) {
            targetDebuff = 2;
        }
        const attackValue = MIN_POWER - attackDebuff + attackBonus;
        const defenseValue = MIN_POWER - targetDebuff + defenseBonus;

        const damage = Math.max(0, attackValue - defenseValue);
        target.healthPower = Math.max(0, target.healthPower - damage);

        return { attacker, target, attackValue, defenseValue };
    }

    executeDebugAttack(attacker: Player, target: Player): AttackResult {
        const attackValue = MIN_POWER + attacker.attackPower;
        const defenseValue = MIN_POWER + 1;

        const damage = Math.max(0, attackValue - defenseValue);
        target.healthPower = Math.max(0, target.healthPower - damage);

        return { attacker, target, attackValue, defenseValue };
    }

    playerWonACombat(player: Player): Player {
        player.nbFightsWon++;
        if (player.team === Teams.None) {
            if (player.nbFightsWon === NUMBER_OF_COMBATS_WON_TO_GAIN_VICTORY) {
                this.playerWonGame(player);
            }
        }

        return player;
    }

    respawnPlayer(player: Player, game: Game): Player {
        player = this.resetPlayerHealth(player);

        const isSpawnOccupied = game.players.some(
            (p) => p._id !== player._id && p.position.x === player.spawnPointPosition.x && p.position.y === player.spawnPointPosition.y,
        );

        if (isSpawnOccupied) {
            const closestTile = this.findClosestTileToSpawnpoint(game, player.spawnPointPosition);
            if (closestTile) {
                player.position = closestTile;
            } else {
                player.position = { x: player.spawnPointPosition.x, y: player.spawnPointPosition.y };
            }
        } else {
            player.position = { x: player.spawnPointPosition.x, y: player.spawnPointPosition.y };
        }

        return player;
    }

    resetPlayerHealth(player: Player): Player {
        player.healthPower = player.maxHealthPower;
        player.escapesAttempts = 0;
        return player;
    }

    playerWonGame(player: Player): Player {
        player.isWinner = true;
        return player;
    }

    tryToEscape(gameId: string, player: Player): boolean {
        if (player.escapesAttempts < 2) {
            player.escapesAttempts++;
            const escapeChance = 0.3;
            const escapeSuccess = Math.random() < escapeChance;
            this.chatService.escapeAttemptEvent(gameId, player, escapeSuccess);
            return escapeSuccess;
        }
        this.chatService.tooManyEscapeAttemptsEvent(gameId, player);
        return false;
    }

    async playerAttackLogic(game: Game, playerId: string, targetId: string, isAnAutoAttack: boolean) {
        const gameId = game.id;

        const attackState = await this.processAttack(game, playerId, targetId);
        if (!attackState) return;

        this.server.to(gameId).emit(GameGatewayEvents.PlayerAttacked, attackState);

        if (!isAnAutoAttack) {
            this.combatTurnLogicService.nextCombatTurn(gameId);
        }

        if (attackState.combatFinished) {
            this.combatFinished(game, attackState);
        }

        this.server.to(gameId).emit(GameGatewayEvents.PlayersUpdated);
    }

    async processAttack(
        game: Game,
        attackerId: string,
        targetId: string,
    ): Promise<{ combatFinished: boolean; attacker: Player; target: Player; attackValue: number; defenseValue: number }> {
        const attacker = game.players.find((player) => player._id === attackerId);
        const target = game.players.find((player) => player._id === targetId);
        if (!attacker || !target) return;

        const { isAttackerDebuffed, isTargetDebuffed } = this.applyIceDebuffs(game, attacker, target);

        const attackResult = game.isDebugModeActive
            ? this.executeDebugAttack(attacker, target)
            : this.executeAttack(attacker, target, isAttackerDebuffed, isTargetDebuffed);

        this.applyCombatItemEffects(target);
        this.chatService.attackEvent(game.id, attackerId, targetId, attackResult);
        return !target.healthPower ? this.endFight(attackResult, game) : { combatFinished: false, ...attackResult };
    }

    private isTileAvailable(tile: TileState, position: Coordinate, playerPositions: Set<string>): boolean {
        const key = `${position.x},${position.y}`;
        return tile.tileCost !== Infinity && !playerPositions.has(key);
    }

    private getPlayerPositionsSet(players: Player[]): Set<string> {
        return new Set(players.map((p) => `${p.position.x},${p.position.y}`));
    }

    private getTile(tiles: TileState[][], x: number, y: number): TileState | null {
        if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0].length) {
            return tiles[y][x];
        }
        return null;
    }

    private findClosestTileToSpawnpoint(game: Game, spawnPointPosition: Coordinate): Coordinate | null {
        if (!game) return null;

        const tiles = game.gridState.grid;
        const playerPositions = this.getPlayerPositionsSet(game.players);

        const visited = new Set<string>();
        const queue: Coordinate[] = [spawnPointPosition];
        visited.add(`${spawnPointPosition.x},${spawnPointPosition.y}`);

        const directions = [
            { dx: -1, dy: 0 },
            { dx: 1, dy: 0 },
            { dx: 0, dy: -1 },
            { dx: 0, dy: 1 },
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            const tile = this.getTile(tiles, current.x, current.y);

            if (tile && this.isTileAvailable(tile, current, playerPositions)) {
                return current;
            }

            for (const { dx, dy } of directions) {
                const nx = current.x + dx;
                const ny = current.y + dy;
                const key = `${nx},${ny}`;

                if (!visited.has(key) && this.getTile(tiles, nx, ny)) {
                    visited.add(key);
                    queue.push({ x: nx, y: ny });
                }
            }
        }

        return null;
    }

    private applyCombatItemEffects(itemHolder: Player) {
        itemHolder.items.forEach((item: GameItem) => {
            const combatItemEffectInfo = {
                gameItem: item,
                player: itemHolder,
            };

            this.itemBehaviorService.applyCombatItemEffect(combatItemEffectInfo);
        });
    }

    private removeActiveCombatItemEffects(itemHolder: Player) {
        itemHolder.items.forEach((item) => {
            const combatItemEffectInfo = {
                gameItem: item,
                player: itemHolder,
            };

            this.itemBehaviorService.removeCombatItemEffect(combatItemEffectInfo);
        });
    }

    private applyEndOfFightItemEffects(game: Game, itemHolder: Player, opposingPlayer: Player) {
        itemHolder.items.forEach((item) => {
            const combatEndItemEffectInfo = {
                gameItem: item,
                itemHolder,
                opposingPlayer,
                game,
            };

            this.itemBehaviorService.applyCombatEndItemEffect(combatEndItemEffectInfo);
        });
    }

    private combatFinished(
        game: Game,
        attackState: { combatFinished: boolean; attacker: Player; target: Player; attackValue: number; defenseValue: number },
    ): void {
        const gameId = game.id;
        const winnerId = attackState.attacker._id;
        const winnerName = attackState.attacker.name;
        this.combatTurnLogicService.endCombat(gameId);
        if (
            ((attackState.attacker.isBot && attackState.attacker.isTurn) || (attackState.target.isBot && attackState.target.isTurn)) &&
            attackState.combatFinished
        ) {
            this.turnLogicService.endBotTurn(gameId);
        }
        this.server.to(gameId).emit(GameGatewayEvents.CombatEnded, { winnerId });
        this.chatService.combatEndedEvent(gameId, winnerId, winnerName);
        this.server.to(gameId).emit(GameGatewayEvents.PlayersUpdated);
        this.server.to(gameId).emit(GameGatewayEvents.UpdateItems);

        if (attackState.attacker.isWinner) {
            this.server.to(gameId).emit(GameGatewayEvents.PlayerWonGame, winnerName);
        }
    }

    private applyIceDebuffs(game: Game, attacker: Player, target: Player) {
        const isAttackerDebuffed = this.isPlayerOnIce(game, attacker) && !game.isDebugModeActive;
        const isTargetDebuffed = this.isPlayerOnIce(game, target) && !game.isDebugModeActive;

        return {
            isAttackerDebuffed,
            isTargetDebuffed,
        };
    }

    private isPlayerOnIce(game: Game, player: Player): boolean {
        const tile = game.gridState.grid[player.position.x][player.position.y];
        if (tile.tileCost === 0) {
            return true;
        }

        return false;
    }

    private endFight(attackResult: AttackResult, game: Game) {
        this.applyEndOfFightItemEffects(game, attackResult.attacker, attackResult.target);
        this.applyEndOfFightItemEffects(game, attackResult.target, attackResult.attacker);

        this.itemBehaviorService.dropAllItems(game, attackResult.target);
        attackResult.target = this.respawnPlayer(attackResult.target, game);

        attackResult.attacker = this.resetPlayerHealth(attackResult.attacker);
        attackResult.attacker = this.playerWonACombat(attackResult.attacker);

        this.removeActiveCombatItemEffects(attackResult.attacker);
        this.removeActiveCombatItemEffects(attackResult.target);

        return {
            combatFinished: true,
            ...attackResult,
        };
    }

    private setBotAttackHandler() {
        this.combatTurnLogicService.registerBotAttackHandler((gameId, firstPlayerToAttack, secondPlayerToAttack) => {
            const botId = firstPlayerToAttack.startsWith('bot-') ? firstPlayerToAttack : secondPlayerToAttack;
            const targetId = firstPlayerToAttack === botId ? secondPlayerToAttack : firstPlayerToAttack;
            const game = this.games.get(gameId);

            if (!game) return;
            const bot = game.players.find((p) => p._id === botId);
            const target = game.players.find((p) => p._id === targetId);

            if (this.shoudlBotTryToEscape(bot)) {
                if (this.tryToEscape(game.id, bot)) {
                    this.botEscaped(gameId, bot, target);
                }
            } else {
                this.playerAttackLogic(game, botId, targetId, true);
            }
        });
    }

    private shoudlBotTryToEscape(bot: Player): boolean {
        if (bot.isAggressive) return false;
        if (bot.escapesAttempts < 2 && bot.healthPower !== bot.maxHealthPower) return true;
        return false;
    }

    private botEscaped(gameId: string, bot: Player, target: Player) {
        this.resetPlayerHealth(target);
        this.resetPlayerHealth(bot);
        this.server.to(gameId).emit(GameGatewayEvents.PlayerEscaped, bot._id);
        this.combatTurnLogicService.endCombat(gameId);
    }
}
