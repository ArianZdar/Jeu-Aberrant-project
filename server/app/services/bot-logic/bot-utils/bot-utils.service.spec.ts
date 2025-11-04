/* eslint-disable @typescript-eslint/no-explicit-any */
import { Game } from '@app/model/class/game/game';
import { Teams } from '@common/game/game-enums';
import { Coordinate } from '@common/game/game-info';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { BotUtilsService } from './bot-utils.service';

describe('BotUtilsService', () => {
    let service: BotUtilsService;

    const ALIVE_ENEMIES_COUNT = 3;

    const mockBot: Player = {
        _id: 'bot1',
        name: 'Bot 1',
        position: { x: 1, y: 1 },
        team: Teams.RedSide,
        isConnected: true,
    } as Player;

    const mockEnemy1: Player = {
        _id: 'enemy1',
        name: 'Enemy 1',
        position: { x: 2, y: 1 },
        team: Teams.BlueSide,
        isConnected: true,
    } as Player;

    const mockEnemy2: Player = {
        _id: 'enemy2',
        name: 'Enemy 2',
        position: { x: 4, y: 4 },
        team: Teams.BlueSide,
        isConnected: true,
    } as Player;

    const mockDisconnectedEnemy: Player = {
        _id: 'enemy3',
        name: 'Enemy 3',
        position: { x: 0, y: 1 },
        team: Teams.BlueSide,
        isConnected: false,
    } as Player;

    const mockTeammate: Player = {
        _id: 'team1',
        name: 'Teammate 1',
        position: { x: 1, y: 0 },
        team: Teams.RedSide,
        isConnected: true,
    } as Player;

    const mockNeutralPlayer: Player = {
        _id: 'neutral1',
        name: 'Neutral Player',
        position: { x: 1, y: 2 },
        team: Teams.None,
        isConnected: true,
    } as Player;

    const mockGame: Partial<Game> = {
        id: 'game1',
        players: [mockBot, mockEnemy1, mockEnemy2, mockDisconnectedEnemy, mockTeammate, mockNeutralPlayer],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [BotUtilsService],
        }).compile();

        service = module.get<BotUtilsService>(BotUtilsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getAliveEnemies', () => {
        it('should return all connected players from enemy team', () => {
            const result = service.getAliveEnemies(mockGame as Game, mockBot);

            expect(result).toHaveLength(ALIVE_ENEMIES_COUNT);
            expect(result).toContain(mockEnemy1);
            expect(result).toContain(mockEnemy2);
            expect(result).toContain(mockNeutralPlayer);

            expect(result).not.toContain(mockDisconnectedEnemy);
            expect(result).not.toContain(mockTeammate);
        });

        it('should return empty array if no alive enemies', () => {
            const gameWithNoEnemies: Partial<Game> = {
                id: 'game2',
                players: [mockBot, mockTeammate],
            };

            const result = service.getAliveEnemies(gameWithNoEnemies as Game, mockBot);
            expect(result).toHaveLength(0);
        });

        it('should include neutral players as enemies', () => {
            const gameWithNeutralOnly: Partial<Game> = {
                id: 'game3',
                players: [mockBot, mockNeutralPlayer],
            };

            const result = service.getAliveEnemies(gameWithNeutralOnly as Game, mockBot);
            expect(result).toHaveLength(1);
            expect(result).toContain(mockNeutralPlayer);
        });
    });

    describe('getAdjacentEnemyToAttack', () => {
        it('should return closest adjacent enemy', () => {
            const enemies = [mockEnemy1, mockEnemy2, mockNeutralPlayer];
            const result = service.getAdjacentEnemyToAttack(mockBot, enemies);

            expect(result).toBe(mockEnemy1);
        });

        it('should return neutral player if adjacent', () => {
            const enemies = [mockEnemy2, mockNeutralPlayer];
            const result = service.getAdjacentEnemyToAttack(mockBot, enemies);

            expect(result).toBe(mockNeutralPlayer);
        });

        it('should return null if no adjacent enemies', () => {
            const enemies = [mockEnemy2];
            const result = service.getAdjacentEnemyToAttack(mockBot, enemies);
            expect(result).toBeNull();
        });

        it('should not return teammate even if adjacent', () => {
            const result = service.getAdjacentEnemyToAttack(mockBot, [mockTeammate]);
            expect(result).toBeNull();
        });

        it('should prioritize first adjacent enemy in the array', () => {
            const enemies = [mockEnemy2, mockEnemy1, mockNeutralPlayer];
            const result = service.getAdjacentEnemyToAttack(mockBot, enemies);

            expect(result).toBe(mockEnemy1);
        });
    });

    describe('canAttackEnemyFromThatTile', () => {
        it('should return true if position is adjacent to enemy', () => {
            const adjacentPosition: Coordinate = { x: 3, y: 4 };
            const result = service.canAttackEnemyFromThatTile(adjacentPosition, mockEnemy2);
            expect(result).toBe(true);
        });

        it('should return false if position is not adjacent to enemy', () => {
            const nonAdjacentPosition: Coordinate = { x: 1, y: 1 };
            const result = service.canAttackEnemyFromThatTile(nonAdjacentPosition, mockEnemy2);
            expect(result).toBe(false);
        });

        it('should return false if position is diagonal to enemy', () => {
            const diagonalPosition: Coordinate = { x: 3, y: 3 };
            const result = service.canAttackEnemyFromThatTile(diagonalPosition, mockEnemy2);
            expect(result).toBe(false);
        });

        it('should return true for horizontally adjacent positions', () => {
            const horizontalPosition: Coordinate = { x: 3, y: 4 };
            const result = service.canAttackEnemyFromThatTile(horizontalPosition, mockEnemy2);
            expect(result).toBe(true);
        });

        it('should return true for vertically adjacent positions', () => {
            const verticalPosition: Coordinate = { x: 4, y: 3 };
            const result = service.canAttackEnemyFromThatTile(verticalPosition, mockEnemy2);
            expect(result).toBe(true);
        });
    });

    describe('isAdjacent (private method)', () => {
        it('should return true for horizontally adjacent positions', () => {
            const pos1: Coordinate = { x: 1, y: 1 };
            const pos2: Coordinate = { x: 2, y: 1 };

            const result = (service as any).isAdjacent(pos1, pos2);
            expect(result).toBe(true);
        });

        it('should return true for vertically adjacent positions', () => {
            const pos1: Coordinate = { x: 1, y: 1 };
            const pos2: Coordinate = { x: 1, y: 2 };

            const result = (service as any).isAdjacent(pos1, pos2);
            expect(result).toBe(true);
        });

        it('should return false for diagonal positions', () => {
            const pos1: Coordinate = { x: 1, y: 1 };
            const pos2: Coordinate = { x: 2, y: 2 };

            const result = (service as any).isAdjacent(pos1, pos2);
            expect(result).toBe(false);
        });

        it('should return false for non-adjacent positions', () => {
            const pos1: Coordinate = { x: 1, y: 1 };
            const pos2: Coordinate = { x: 3, y: 1 };

            const result = (service as any).isAdjacent(pos1, pos2);
            expect(result).toBe(false);
        });

        it('should return false for the same position', () => {
            const pos: Coordinate = { x: 1, y: 1 };

            const result = (service as any).isAdjacent(pos, pos);
            expect(result).toBe(false);
        });
    });
});
