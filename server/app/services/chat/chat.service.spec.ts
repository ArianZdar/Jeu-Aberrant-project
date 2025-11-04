import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { Server, Socket } from 'socket.io';
import { Game } from '@app/model/class/game/game';
import { Player } from '@common/player/player';
import { ChatMessage } from '@common/game/message';
import { ActionJournalEvents, CommonGatewayEvents } from '@common/events/gateway-events';
import { GameObjects, ITEM_LABELS_FR } from '@common/game/game-enums';
import { WORD_MAX_LENGTH } from '@app/constants/server-constants';

import { AttackResult } from '@common/player/attack-result';

describe('ChatService', () => {
    let service: ChatService;
    let baseGatewayServiceMock: Partial<BaseGatewayService>;
    let serverMock: Partial<Server>;
    let socketMock: Partial<Socket>;

    beforeEach(async () => {
        serverMock = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };

        socketMock = {
            emit: jest.fn(),
        };

        baseGatewayServiceMock = {
            addMessageToRoom: jest.fn(),
            getMessagesFromRoom: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [ChatService, { provide: BaseGatewayService, useValue: baseGatewayServiceMock }],
        }).compile();

        service = module.get<ChatService>(ChatService);
        service.setServer(serverMock as Server);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server', () => {
            const newServerMock = {} as Server;
            service.setServer(newServerMock);
        });
    });

    describe('handleRoomMessage', () => {
        it('should handle valid room message', () => {
            const game = { id: 'game1' } as Game;
            const message: ChatMessage = {
                content: 'Hello',
                senderId: 'User1',
                senderName: 'User1Name',
                timeStamp: new Date().toISOString(),
            };

            service.handleRoomMessage(game, message);

            expect(baseGatewayServiceMock.addMessageToRoom).toHaveBeenCalledWith(game.id, message);
            expect(serverMock.to).toHaveBeenCalledWith(game.id);
            expect(serverMock.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, message);
        });

        it('should trim message content if too long', () => {
            const game = { id: 'game1' } as Game;
            const longMessage = 'a'.repeat(WORD_MAX_LENGTH + 1);
            const message: ChatMessage = {
                content: longMessage,
                senderId: 'User1',
                senderName: 'User1Name',
                timeStamp: new Date().toISOString(),
            };
            const expectedTrimmedMessage = { ...message, content: longMessage.substring(0, WORD_MAX_LENGTH) };

            service.handleRoomMessage(game, message);

            expect(baseGatewayServiceMock.addMessageToRoom).toHaveBeenCalledWith(game.id, expectedTrimmedMessage);
            expect(serverMock.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, expectedTrimmedMessage);
        });

        it('should do nothing if game is not provided', () => {
            const message: ChatMessage = {
                content: 'Hello',
                senderId: 'User1',
                senderName: 'User1Name',
                timeStamp: new Date().toISOString(),
            };

            service.handleRoomMessage(null, message);

            expect(baseGatewayServiceMock.addMessageToRoom).not.toHaveBeenCalled();
            expect(serverMock.to).not.toHaveBeenCalled();
        });
    });

    describe('handleChatHistory', () => {
        it('should emit chat history when messages exist', () => {
            const lobbyId = 'lobby1';
            const messages = [
                { content: 'Hello', sender: 'User1', timestamp: new Date() },
                { content: 'Hi', sender: 'User2', timestamp: new Date() },
            ];

            baseGatewayServiceMock.getMessagesFromRoom = jest.fn().mockReturnValue({ messages });

            service.handleChatHistory(socketMock as Socket, lobbyId);

            expect(baseGatewayServiceMock.getMessagesFromRoom).toHaveBeenCalledWith(lobbyId);
            expect(socketMock.emit).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, messages);
        });

        it('should emit empty array when no messages exist', () => {
            const lobbyId = 'lobby1';

            baseGatewayServiceMock.getMessagesFromRoom = jest.fn().mockReturnValue(null);

            service.handleChatHistory(socketMock as Socket, lobbyId);

            expect(socketMock.emit).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, []);
        });

        it('should do nothing if no lobbyId provided', () => {
            service.handleChatHistory(socketMock as Socket, null);

            expect(baseGatewayServiceMock.getMessagesFromRoom).not.toHaveBeenCalled();
            expect(socketMock.emit).not.toHaveBeenCalled();
        });
    });

    describe('sendFirstTurnMessage', () => {
        it('should send message for player whose turn it is', () => {
            const player1 = { name: 'Player1', _id: 'p1', isTurn: true } as Player;
            const player2 = { name: 'Player2', _id: 'p2', isTurn: false } as Player;
            const game = { id: 'game1', players: [player1, player2] } as Game;

            jest.spyOn(service, 'nextTurnEvent');

            service.sendFirstTurnMessage(game);

            expect(service.nextTurnEvent).toHaveBeenCalledWith(game.id, player1.name, player1._id);
        });

        it('should do nothing if game is not provided', () => {
            jest.spyOn(service, 'nextTurnEvent');

            service.sendFirstTurnMessage(null);

            expect(service.nextTurnEvent).not.toHaveBeenCalled();
        });
    });

    describe('doorEvent', () => {
        it('should emit door closed message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;

            service.doorEvent(gameId, player, true);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.DoorToggleJournal, {
                message: `${player.name} a fermé une porte.`,
                involvedPlayers: [player._id],
            });
        });

        it('should emit door opened message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;

            service.doorEvent(gameId, player, false);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.DoorToggleJournal, {
                message: `${player.name} a ouvert une porte.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('playerLeftEvent', () => {
        it('should emit player left message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;

            service.playerLeftEvent(gameId, player);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.LeaveGameJournal, {
                message: `${player.name} a quitté la partie.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('toggleDebugEvent', () => {
        it('should emit debug mode activated message', () => {
            const player = { name: 'Player1', _id: 'p1' } as Player;
            const game = { id: 'game1', isDebugModeActive: true } as Game;

            service.toggleDebugEvent(game, player);

            expect(serverMock.to).toHaveBeenCalledWith(game.id);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.ToggleDebugJournal, {
                message: `${player.name} a activé le mode debug.`,
                involvedPlayers: [player._id],
            });
        });

        it('should emit debug mode deactivated message', () => {
            const player = { name: 'Player1', _id: 'p1' } as Player;
            const game = { id: 'game1', isDebugModeActive: false } as Game;

            service.toggleDebugEvent(game, player);

            expect(serverMock.to).toHaveBeenCalledWith(game.id);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.ToggleDebugJournal, {
                message: `${player.name} a désactivé le mode debug.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('startCombatEvent', () => {
        it('should emit combat started message', () => {
            const gameId = 'game1';
            const attacker = { name: 'Player1', _id: 'p1' } as Player;
            const target = { name: 'Player2', _id: 'p2' } as Player;

            service.startCombatEvent(gameId, attacker, target);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.CombatJournal, {
                message: `Combat commencé entre ${attacker.name} et ${target.name}.`,
                involvedPlayers: [attacker._id, target._id],
            });
        });
    });

    describe('pickupItemEvent', () => {
        it('should emit item pickup message with translated item name', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;
            const itemKey = GameObjects.SwiftnessBoots;

            service.pickupItemEvent(gameId, player, itemKey);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.ItemPickedUp, {
                message: `${player.name} a ramassé ${ITEM_LABELS_FR[itemKey]}.`,
                involvedPlayers: [player._id],
            });
        });

        it('should use original item name if translation not found', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;
            const itemKey = 'UNKNOWN_ITEM';

            service.pickupItemEvent(gameId, player, itemKey);

            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.ItemPickedUp, {
                message: `${player.name} a ramassé ${itemKey}.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('escapeAttemptEvent', () => {
        it('should emit successful escape message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1', escapesAttempts: 1 } as Player;
            const escapeSuccess = true;

            service.escapeAttemptEvent(gameId, player, escapeSuccess);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.CombatEscapeAttemptJournal, {
                message: `${player.name} tente de s'échapper (tentative ${player.escapesAttempts}/2).\nTentative réussie! Le combat est terminé.`,
                involvedPlayers: [player._id],
            });
        });

        it('should emit failed escape message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1', escapesAttempts: 2 } as Player;
            const escapeSuccess = false;

            service.escapeAttemptEvent(gameId, player, escapeSuccess);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.CombatEscapeAttemptJournal, {
                message: `${player.name} tente de s'échapper (tentative ${player.escapesAttempts}/2).\nTentative échouée! Le combat continue.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('tooManyEscapeAttemptsEvent', () => {
        it('should emit too many escape attempts message', () => {
            const gameId = 'game1';
            const player = { name: 'Player1', _id: 'p1' } as Player;

            service.tooManyEscapeAttemptsEvent(gameId, player);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.CombatEscapeAttemptJournalFailed, {
                message: `${player.name} a déjà tenté de s'échapper 2 fois et ne peut plus fuir.`,
                involvedPlayers: [player._id],
            });
        });
    });

    describe('attackEvent', () => {
        it('should emit attack event with formatted message', () => {
            const gameId = 'game1';
            const attackerId = 'attacker1';
            const targetId = 'target1';
            const attackResult = {
                attacker: { name: 'Attacker' },
                target: {
                    name: 'Target',
                    healthPower: 8,
                    maxHealthPower: 10,
                },
                attackValue: 7,
                defenseValue: 5,
            } as AttackResult;

            service.attackEvent(gameId, attackerId, targetId, attackResult);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.AttackJournalResult, {
                message: expect.stringContaining(`${attackResult.attacker.name} attaque ${attackResult.target.name}`),
                involvedPlayers: [attackerId, targetId],
            });

            const emitCall = (serverMock.emit as jest.Mock).mock.calls.find((call) => call[0] === ActionJournalEvents.AttackJournalResult);
            const message = emitCall[1].message;

            expect(message).toContain(`Jet d'attaque: ${attackResult.attackValue}`);
            expect(message).toContain(`Jet de défense: ${attackResult.defenseValue}`);
            expect(message).toContain(`Dégâts: ${attackResult.attackValue - attackResult.defenseValue}`);
            expect(message).toContain(
                `Points de vie de ${attackResult.target.name}: ${attackResult.target.healthPower}/${attackResult.target.maxHealthPower}`,
            );
        });
    });

    describe('nextTurnEvent', () => {
        it('should emit next turn event', () => {
            const gameId = 'game1';
            const playerName = 'Player1';
            const nextPlayerId = 'p1';

            service.nextTurnEvent(gameId, playerName, nextPlayerId);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.TurnJournalTransition, {
                message: `${playerName} commence son tour.`,
                involvedPlayers: [nextPlayerId],
            });
        });
    });

    describe('combatEndedEvent', () => {
        it('should emit combat ended event', () => {
            const gameId = 'game1';
            const winnerId = 'winner1';
            const winnerName = 'Winner';

            service.combatEndedEvent(gameId, winnerId, winnerName);

            expect(serverMock.to).toHaveBeenCalledWith(gameId);
            expect(serverMock.emit).toHaveBeenCalledWith(ActionJournalEvents.CombatJournalEnded, {
                message: `${winnerName} a gagné le combat.`,
                involvedPlayers: [winnerId],
            });
        });
    });
});
