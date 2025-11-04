/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable max-lines */
import { Game } from '@app/model/class/game/game';
import { ChatService } from '@app/services/chat/chat.service';
import { CombatLogicService } from '@app/services/combat-logic/combat-logic.service';
import { CombatTurnLogicService } from '@app/services/combat-turn-logic/combat-turn-logic.service';
import { GameManagerService } from '@app/services/game-manager/game-manager.service';
import { Teams } from '@common/game/game-enums';
import { GameGatewayEvents } from '@common/events/gateway-events';
import { Player } from '@common/player/player';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { CombatGatewayService } from './combat-gateway.service';

describe('CombatGatewayService', () => {
    let service: CombatGatewayService;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    let gameManagerServiceMock: Partial<GameManagerService>;
    let combatTurnLogicServiceMock: Partial<CombatTurnLogicService>;
    let combatLogicServiceMock: Partial<CombatLogicService>;
    let chatServiceMock: Partial<ChatService>;

    const mockGameId = 'game-123';
    const mockAttackerId = 'attacker-123';
    const mockTargetId = 'target-123';

    const mockAttacker: Partial<Player> = {
        _id: mockAttackerId,
        name: 'Attacker',
        team: Teams.BlueSide,
        actionPoints: 2,
        maxSpeed: 3,
        isLeader: false,
        isWinner: false,
    };

    const mockTarget: Partial<Player> = {
        _id: mockTargetId,
        name: 'Target',
        team: Teams.RedSide,
        maxSpeed: 2,
        isWinner: false,
    };

    const mockGame: Partial<Game> = {
        id: mockGameId,
        players: [mockAttacker as Player, mockTarget as Player],
        isDebugModeActive: false,
        toggleDebug: jest.fn(),
    };

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        mockSocket = {
            id: mockAttackerId,
            join: jest.fn(),
            emit: jest.fn(),
        };

        gameManagerServiceMock = {
            findGameByPlayerId: jest.fn().mockImplementation((playerId: string) => {
                return playerId === mockAttackerId || playerId === mockTargetId ? (mockGame as Game) : undefined;
            }),
            getPlayerDebuffs: jest.fn().mockReturnValue({ isAttackerDebuffed: false, isTargetDebuffed: false }),
            opponentDisconnectedInCombat: jest.fn(),
        };

        combatTurnLogicServiceMock = {
            startCombat: jest.fn(),
            endCombat: jest.fn(),
            nextCombatTurn: jest.fn(),
        };

        combatLogicServiceMock = {
            tryToEscape: jest.fn(),
            resetPlayerHealth: jest.fn(),
        };

        chatServiceMock = {
            startCombatEvent: jest.fn(),
            toggleDebugEvent: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CombatGatewayService,
                { provide: GameManagerService, useValue: gameManagerServiceMock },
                { provide: CombatTurnLogicService, useValue: combatTurnLogicServiceMock },
                { provide: CombatLogicService, useValue: combatLogicServiceMock },
                { provide: ChatService, useValue: chatServiceMock },
            ],
        }).compile();

        service = module.get<CombatGatewayService>(CombatGatewayService);
        service.setServer(mockServer as Server);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server instance', () => {
            const newServer = {
                emit: jest.fn(),
                to: jest.fn().mockReturnThis(),
            } as unknown as Server;

            service.setServer(newServer);
            service.opponentDisconnected(mockAttackerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(newServer.to).toHaveBeenCalledWith(mockGameId);
            expect(newServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded, { playerId: mockAttackerId });
        });
    });

    describe('startCombatLogic', () => {
        it('should not start combat if attacker or target is not found in game', async () => {
            const gameWithoutTargetOrAttacker = {
                ...mockGame,
                players: [{ _id: 'some-other-player-id', name: 'Other Player' } as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithoutTargetOrAttacker as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should determine turn order based on speed (faster player goes first)', async () => {
            const slowerAttacker = {
                ...mockAttacker,
                maxSpeed: 2,
            };

            const fasterTarget = {
                ...mockTarget,
                maxSpeed: 5,
            };

            const gameWithSpeedDifference = {
                ...mockGame,
                players: [slowerAttacker as Player, fasterTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithSpeedDifference as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(combatTurnLogicServiceMock.startCombat).toHaveBeenCalledWith(mockGameId, mockTargetId, mockAttackerId);
        });

        it('should start combat between two players', async () => {
            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).toHaveBeenCalledWith(mockGameId, mockAttackerId, mockTargetId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(
                GameGatewayEvents.CombatStarted,
                expect.objectContaining({
                    attackerId: mockAttackerId,
                    targetId: mockTargetId,
                }),
            );
            expect(chatServiceMock.startCombatEvent).toHaveBeenCalledWith(mockGameId, mockAttacker, mockTarget);
            expect(mockAttacker.actionPoints).toBe(1);
        });

        it('should not start combat if game is not found', async () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
        });

        it('should not start combat if players are from the same team (except Teams.None)', async () => {
            const sameTeamAttacker = { ...mockAttacker, team: Teams.BlueSide };
            const sameTeamTarget = { ...mockTarget, team: Teams.BlueSide };

            const sameTeamGame = {
                ...mockGame,
                players: [sameTeamAttacker as Player, sameTeamTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(sameTeamGame as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).not.toHaveBeenCalled();
        });

        it('should allow combat for players with Teams.None even if same team', async () => {
            const noneTeamAttacker = { ...mockAttacker, team: Teams.None };
            const noneTeamTarget = { ...mockTarget, team: Teams.None };

            const noneTeamGame = {
                ...mockGame,
                players: [noneTeamAttacker as Player, noneTeamTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(noneTeamGame as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).toHaveBeenCalled();
        });

        it('should not start combat if attacker has no action points', async () => {
            const noActionPointsAttacker = { ...mockAttacker, actionPoints: 0 };

            const noApGame = {
                ...mockGame,
                players: [noActionPointsAttacker as Player, mockTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(noApGame as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatTurnLogicServiceMock.startCombat).not.toHaveBeenCalled();
        });

        it('should determine turn order based on speed (faster player goes first)', async () => {
            const fasterAttacker = { ...mockAttacker, maxSpeed: 5 };

            const fasterAttackerGame = {
                ...mockGame,
                players: [fasterAttacker as Player, mockTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(fasterAttackerGame as Game);

            await service.startCombatLogic(mockAttackerId, mockTargetId);

            expect(combatTurnLogicServiceMock.startCombat).toHaveBeenCalledWith(mockGameId, mockAttackerId, mockTargetId);
        });
    });

    describe('attemptEscape', () => {
        it('should allow player to escape when successful', () => {
            combatLogicServiceMock.tryToEscape = jest.fn().mockReturnValue(true);

            const result = service.attemptEscape(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatLogicServiceMock.tryToEscape).toHaveBeenCalledWith(mockGameId, mockAttacker);
            expect(combatLogicServiceMock.resetPlayerHealth).toHaveBeenCalledWith(mockAttacker);
            expect(combatLogicServiceMock.resetPlayerHealth).toHaveBeenCalledWith(mockTarget);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.PlayerEscaped, mockAttackerId);
            expect(combatTurnLogicServiceMock.endCombat).toHaveBeenCalledWith(mockGameId);
            expect(combatTurnLogicServiceMock.nextCombatTurn).toHaveBeenCalledWith(mockGameId);
            expect(result).toEqual({ canEscape: true });
        });

        it('should not allow escape when unsuccessful', () => {
            combatLogicServiceMock.tryToEscape = jest.fn().mockReturnValue(false);

            const result = service.attemptEscape(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(combatLogicServiceMock.tryToEscape).toHaveBeenCalledWith(mockGameId, mockAttacker);
            expect(combatLogicServiceMock.resetPlayerHealth).not.toHaveBeenCalled();
            expect(mockServer.to(mockGameId).emit).not.toHaveBeenCalledWith(GameGatewayEvents.PlayerEscaped, mockAttackerId);
            expect(combatTurnLogicServiceMock.endCombat).not.toHaveBeenCalled();
            expect(combatTurnLogicServiceMock.nextCombatTurn).toHaveBeenCalledWith(mockGameId);
            expect(result).toEqual({ canEscape: false });
        });

        it('should return false if game is not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            const result = service.attemptEscape(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(result).toBe(false);
        });

        it('should return false if player is not found', () => {
            const gameWithoutPlayer = {
                ...mockGame,
                players: [mockTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithoutPlayer as Game);

            const result = service.attemptEscape(mockAttackerId, mockTargetId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(result).toBe(false);
        });
    });

    describe('opponentDisconnected', () => {
        it('should handle opponent disconnection correctly', () => {
            service.opponentDisconnected(mockAttackerId);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameManagerServiceMock.opponentDisconnectedInCombat).toHaveBeenCalledWith(mockAttackerId);
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.CombatEnded, { playerId: mockAttackerId });
            expect(combatTurnLogicServiceMock.endCombat).toHaveBeenCalledWith(mockGameId);
        });

        it('should emit player won game event if player is winner', () => {
            const winnerPlayer = { ...mockAttacker, isWinner: true };

            const gameWithWinner = {
                ...mockGame,
                players: [winnerPlayer as Player, mockTarget as Player],
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithWinner as Game);

            service.opponentDisconnected(mockAttackerId);

            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.PlayerWonGame, winnerPlayer.name);
        });
    });

    describe('toggleDebugMode', () => {
        it('should toggle debug mode if player is leader', () => {
            const leaderPlayer = { ...mockAttacker, isLeader: true };

            const gameWithLeader = {
                ...mockGame,
                players: [leaderPlayer as Player, mockTarget as Player],
                toggleDebug: jest.fn().mockImplementation(() => {
                    (gameWithLeader as any).isDebugModeActive = !(gameWithLeader as any).isDebugModeActive;
                }),
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithLeader as unknown as Game);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameWithLeader.toggleDebug).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.ToggleDebug, gameWithLeader.isDebugModeActive);
            expect(chatServiceMock.toggleDebugEvent).toHaveBeenCalledWith(gameWithLeader, leaderPlayer);
        });

        it('should not toggle debug mode if game is not found', () => {
            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(undefined);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(mockServer.to).not.toHaveBeenCalled();
            expect(chatServiceMock.toggleDebugEvent).not.toHaveBeenCalled();
        });

        it('should not toggle debug mode if players is undefined', () => {
            const gameWithoutPlayers = {
                ...mockGame,
                players: undefined,
                toggleDebug: jest.fn(),
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithoutPlayers as unknown as Game);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameWithoutPlayers.toggleDebug).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalled();
            expect(chatServiceMock.toggleDebugEvent).not.toHaveBeenCalled();
        });

        it('should toggle debug mode if player is leader', () => {
            const leaderPlayer = { ...mockAttacker, isLeader: true };

            const gameWithLeader = {
                ...mockGame,
                players: [leaderPlayer as Player, mockTarget as Player],
                toggleDebug: jest.fn().mockImplementation(() => {
                    (gameWithLeader as any).isDebugModeActive = !(gameWithLeader as any).isDebugModeActive;
                }),
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithLeader as unknown as Game);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameWithLeader.toggleDebug).toHaveBeenCalled();
            expect(mockServer.to).toHaveBeenCalledWith(mockGameId);
            expect(mockServer.to(mockGameId).emit).toHaveBeenCalledWith(GameGatewayEvents.ToggleDebug, gameWithLeader.isDebugModeActive);
            expect(chatServiceMock.toggleDebugEvent).toHaveBeenCalledWith(gameWithLeader, leaderPlayer);
        });

        it('should not toggle debug mode if player is not leader', () => {
            const nonLeaderPlayer = { ...mockAttacker, isLeader: false };

            const gameWithNonLeader = {
                ...mockGame,
                players: [nonLeaderPlayer as Player, mockTarget as Player],
                toggleDebug: jest.fn(),
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithNonLeader as unknown as Game);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameWithNonLeader.toggleDebug).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalledWith(mockGameId);
            expect(chatServiceMock.toggleDebugEvent).not.toHaveBeenCalled();
        });

        it('should not toggle debug mode if player is not leader', () => {
            const nonLeaderPlayer = { ...mockAttacker, isLeader: false };

            const gameWithNonLeader = {
                ...mockGame,
                players: [nonLeaderPlayer as Player, mockTarget as Player],
                toggleDebug: jest.fn(),
            };

            gameManagerServiceMock.findGameByPlayerId = jest.fn().mockReturnValue(gameWithNonLeader as unknown as Game);

            service.toggleDebugMode(mockSocket as Socket);

            expect(gameManagerServiceMock.findGameByPlayerId).toHaveBeenCalledWith(mockAttackerId);
            expect(gameWithNonLeader.toggleDebug).not.toHaveBeenCalled();
            expect(mockServer.to).not.toHaveBeenCalledWith(mockGameId);
            expect(chatServiceMock.toggleDebugEvent).not.toHaveBeenCalled();
        });
    });
});
