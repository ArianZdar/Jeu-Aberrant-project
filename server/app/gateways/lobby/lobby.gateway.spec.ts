/* eslint-disable max-lines */
import { WORD_MAX_LENGTH } from '@app/constants/server-constants';
import { FakeLobby } from '@app/model/class/lobby/fake-lobby';
import { Lobby } from '@app/model/class/lobby/lobby';
import { BaseGatewayService } from '@app/services/base-gateway/base-gateway.service';
import { BotManagerService } from '@app/services/bot-logic/bot-manager/bot-manager.service';
import { RoomGeneratorService } from '@app/services/room-generator/room-generator.service';
import { CommonGatewayEvents, LobbyGatewayEvents } from '@common/events/gateway-events';
import { PlayerInfo } from '@common/player/player-info';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { LobbyGateway } from './lobby.gateway';

describe('LobbyGateway', () => {
    const NB_PLAYERS = 4;
    const OVER_MAX_CARACTER_LIMIT = 1000;
    let gateway: LobbyGateway;
    let botManagerService: Partial<BotManagerService>;
    let baseGatewayService: Partial<BaseGatewayService>;
    let roomGeneratorService: Partial<RoomGeneratorService>;
    let server: Partial<Server>;
    let mapId: string;
    let lobbyCode: string;
    let playerId1: string;
    let playerId2: string;
    let playerName1: string;
    let playerName2: string;
    let mockPlayerInfo: PlayerInfo;
    let mockPlayerInfo2: PlayerInfo;

    const createSocketMock = FakeLobby.createSocketMock;

    beforeEach(async () => {
        const mockData = FakeLobby.createMockLobbyData();
        mapId = mockData.mapId;
        lobbyCode = mockData.lobbyCode;
        playerId1 = mockData.playerId1;
        playerId2 = mockData.playerId2;
        playerName1 = mockData.playerName1;
        playerName2 = mockData.playerName2;
        mockPlayerInfo = mockData.mockPlayerInfo;
        mockPlayerInfo2 = mockData.mockPlayerInfo2;
        baseGatewayService = {
            ...mockData.baseGatewayService,
            joinChatRoom: jest.fn(),
            addMessageToRoom: jest.fn(),
            getMessagesFromRoom: jest.fn(),
        };
        roomGeneratorService = mockData.roomGeneratorService;
        botManagerService = mockData.botManagerService;
        server = mockData.server;

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                LobbyGateway,
                { provide: BaseGatewayService, useValue: baseGatewayService },
                { provide: RoomGeneratorService, useValue: roomGeneratorService },
                { provide: BotManagerService, useValue: botManagerService },
            ],
        }).compile();

        gateway = module.get<LobbyGateway>(LobbyGateway);
        gateway['server'] = server as Server;
    });

    describe('Gateway Initialization', () => {
        it('should set namespace to /lobby during construction', () => {
            expect(baseGatewayService.setNamespace).toHaveBeenCalledWith('/lobby');
        });

        it('should set server during afterInit', () => {
            gateway.afterInit();
            expect(baseGatewayService.setServer).toHaveBeenCalledWith(server);
        });

        it('should call leaveLobby when a socket disconnects', () => {
            const socket = createSocketMock(playerId1);
            const leaveLobbyMock = jest.spyOn(gateway, 'leaveLobby').mockImplementation();

            gateway.handleDisconnect(socket as unknown as Socket);

            expect(leaveLobbyMock).toHaveBeenCalledWith(socket);
        });
    });

    describe('Room Creation and Joining', () => {
        it('should create a room with correct parameters', () => {
            const socket = createSocketMock(playerId1);

            gateway.createRoom(socket as unknown as Socket, { mapId, maxPlayers: NB_PLAYERS, isLocked: false });

            expect(roomGeneratorService.generateRoom).toHaveBeenCalled();
            expect(socket.join).toHaveBeenCalledWith(lobbyCode);

            const lobby = gateway['lobbys'].get(lobbyCode);
            expect(lobby).toBeDefined();
            expect(lobby.getMapId()).toBe(mapId);
        });

        it('should emit error when joining a non-existent lobby', () => {
            const joinSocket = createSocketMock(playerId2);

            gateway.joinLobby(joinSocket as unknown as Socket, '9999');

            expect(joinSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ErrorLobby, { hasJoinedLobby: false });
        });

        it('should allow joining an existing lobby', () => {
            const socket = createSocketMock(playerId1);
            gateway.createRoom(socket as unknown as Socket, { mapId, maxPlayers: NB_PLAYERS, isLocked: false });
            const lobby = gateway['lobbys'].get(lobbyCode);

            const joinSocket = createSocketMock(playerId2);
            gateway.joinLobby(joinSocket as unknown as Socket, lobbyCode);

            expect(baseGatewayService.joinSpecificRoom).toHaveBeenCalledWith(joinSocket, lobbyCode);
            expect(joinSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.JoinLobby, { hasJoinedLobby: true, lobby });
        });

        it('should emit CommonGatewayEvents.ChatHistory when joining a lobby and there is old message', () => {
            const socket = createSocketMock(playerId1);
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, lobby);
            const messages = [{ content: 'test message' }];
            baseGatewayService.getMessagesFromRoom = jest.fn().mockReturnValue({ messages });

            gateway.joinLobby(socket as unknown as Socket, lobbyCode);

            expect(socket.emit).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, messages);
        });
    });

    describe('Leaving and Kicking', () => {
        it('should leave all rooms when leaveLobby is called', () => {
            const socket = createSocketMock(playerId1, [lobbyCode, 'anotherRoom']);

            gateway.leaveLobby(socket as unknown as Socket);

            expect(socket.leave).toHaveBeenCalledWith(lobbyCode);
            expect(socket.leave).toHaveBeenCalledWith('anotherRoom');
        });

        it('should notify others when a leader leaves', () => {
            const leaderLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            leaderLobby.addPlayer({ ...mockPlayerInfo, isLeader: true });
            gateway['lobbys'].set(lobbyCode, leaderLobby);

            const leaderSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.leaveLobby(leaderSocket as unknown as Socket);

            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.LeaderLeft, leaderLobby);
        });

        it('should notify others when a regular player leaves', () => {
            const playerLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            playerLobby.addPlayer({ ...mockPlayerInfo, isLeader: false });
            gateway['lobbys'].set(lobbyCode, playerLobby);
            server.to = jest.fn().mockReturnValue({ emit: jest.fn() });

            const playerSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.leaveLobby(playerSocket as unknown as Socket);

            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.PlayerLeft, playerLobby);
        });

        it('should kick a player when kickPlayer is called', () => {
            const kickLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            kickLobby.addPlayer(mockPlayerInfo);
            kickLobby.addPlayer(mockPlayerInfo2);
            gateway['lobbys'].set(lobbyCode, kickLobby);

            const kickerSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.kickPlayer(kickerSocket as unknown as Socket, playerName2);

            expect(server.to(playerId2).emit).toHaveBeenCalledWith(LobbyGatewayEvents.Kicked);
        });

        it('should handle kicking a bot', () => {
            const botPlayer = { ...mockPlayerInfo2, isBot: true };
            const kickLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            kickLobby.addPlayer(mockPlayerInfo);
            kickLobby.addPlayer(botPlayer);
            gateway['lobbys'].set(lobbyCode, kickLobby);

            const kickerSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.kickPlayer(kickerSocket as unknown as Socket, playerName2);

            expect(server.to(playerId2).emit).toHaveBeenCalledWith(LobbyGatewayEvents.Kicked);
        });
    });

    describe('Champion Selection', () => {
        it('should reject player when lobby is locked and player is not already in it', () => {
            const lockedLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, true);
            gateway['lobbys'].set(lobbyCode, lockedLobby);
            jest.spyOn(lockedLobby, 'isLocked').mockReturnValue(true);
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const newPlayer = { ...mockPlayerInfo, _id: playerId1 };
            gateway.finishChampionSelection(socket as unknown as Socket, newPlayer);
            expect(server.to).toHaveBeenCalledWith(playerId1);
            expect(server.to(playerId1).emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampSelectError, { message: 'La partie est verrouillée.' });
            expect(lockedLobby.hasPlayer(playerId1)).toBeFalsy();
        });

        it('should prevent selection of already taken champions', () => {
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            lobby.addPlayer({ ...mockPlayerInfo, _id: playerId1, championIndex: 1 });
            gateway['lobbys'].set(lobbyCode, lobby);
            jest.spyOn(lobby, 'isChampionIndexTaken');
            const socket2 = createSocketMock(playerId2, [lobbyCode]);
            const conflictingPlayer = { ...mockPlayerInfo2, _id: playerId2, championIndex: 1 };
            gateway.finishChampionSelection(socket2 as unknown as Socket, conflictingPlayer);
            expect(lobby.isChampionIndexTaken).toHaveBeenCalledWith(1, playerId2);
            expect(server.to).toHaveBeenCalledWith(playerId2);
            expect(server.to(playerId2).emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampSelectError, {
                message: 'Ce champion est déjà pris par un autre joueur.',
            });
        });

        it('should make the first player to join the leader', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, lobby);

            const newPlayer = { ...mockPlayerInfo, _id: playerId1, isLeader: false };
            gateway.finishChampionSelection(socket as unknown as Socket, newPlayer);

            expect(lobby.getPlayer(playerId1).isLeader).toBe(true);
        });

        it('should handle player rejoining without duplicating them', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, lobby);
            const player = { ...mockPlayerInfo, _id: playerId1, isLeader: false };
            gateway.finishChampionSelection(socket as unknown as Socket, player);
            gateway.finishChampionSelection(socket as unknown as Socket, player);
            expect(lobby.getPlayers().length).toBe(1);
        });
    });

    describe('Player Naming', () => {
        it('should handle duplicate player names by appending numbers', () => {
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, lobby);
            const socket1 = createSocketMock(playerId1, [lobbyCode]);
            const player1: PlayerInfo = {
                ...mockPlayerInfo,
                _id: playerId1,
                name: 'TestPlayer',
                isLeader: false,
            };
            gateway.finishChampionSelection(socket1 as unknown as Socket, player1);
            expect(lobby.getPlayer(playerId1).name).toBe('TestPlayer');
            const socket2 = createSocketMock(playerId2, [lobbyCode]);
            const player2: PlayerInfo = {
                ...mockPlayerInfo2,
                _id: playerId2,
                name: 'TestPlayer',
                isLeader: false,
            };
            gateway.finishChampionSelection(socket2 as unknown as Socket, player2);
            expect(lobby.getPlayer(playerId2).name).toBe('TestPlayer-2');
            const additionalPlayerIndex = 3;
            const player3Id = 'player3';
            const socket3 = createSocketMock(player3Id, [lobbyCode]);
            const player3: PlayerInfo = {
                ...FakeLobby.createAdditionalPlayer(additionalPlayerIndex),
                _id: player3Id,
                name: 'TestPlayer',
            };
            gateway.finishChampionSelection(socket3 as unknown as Socket, player3);
            expect(lobby.getPlayer(player3Id).name).toBe('TestPlayer-3');
        });
    });

    describe('Champion Selection Events', () => {
        it('should broadcast when a champion is selected', () => {
            const testLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, testLobby);
            const socket = createSocketMock(playerId1, [lobbyCode]);

            jest.spyOn(testLobby, 'getSelectedChampionIndex').mockReturnValue([2]);
            gateway.championSelected(socket as unknown as Socket, { index: 2 });

            expect(socket.to).toHaveBeenCalledWith(lobbyCode);
            expect(socket.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, { championsIndex: [2] });
        });

        it('should handle changing champion selection by removing old selection', () => {
            const INDEX_THREE = 3;
            const testLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, testLobby);
            const socket = createSocketMock(playerId1, [lobbyCode]);

            jest.spyOn(testLobby, 'removeSelectedChampionIndex');
            jest.spyOn(testLobby, 'getSelectedChampionIndex').mockReturnValue([INDEX_THREE]);

            gateway.championSelected(socket as unknown as Socket, { index: INDEX_THREE, oldIndex: 2 });

            expect(testLobby.removeSelectedChampionIndex).toHaveBeenCalledWith(2);
            expect(socket.to).toHaveBeenCalledWith(lobbyCode);
            expect(socket.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, { championsIndex: [INDEX_THREE] });
        });

        it('should broadcast when a champion is deselected', () => {
            const testLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            const player = { ...mockPlayerInfo, _id: playerId1, championIndex: 2 };
            testLobby.addPlayer(player);
            gateway['lobbys'].set(lobbyCode, testLobby);
            const socket = createSocketMock(playerId1, [lobbyCode]);

            jest.spyOn(testLobby, 'getPlayer').mockReturnValue(player);
            jest.spyOn(testLobby, 'getSelectedChampionIndex').mockReturnValue([]);

            gateway.championDeselected(socket as unknown as Socket);

            expect(socket.to).toHaveBeenCalledWith(lobbyCode);
            expect(socket.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, { championsIndex: [] });
        });

        it('should return currently selected champions', () => {
            const INDEX_THREE = 3;
            const testLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, testLobby);
            const socket = createSocketMock(playerId1, [lobbyCode]);

            jest.spyOn(testLobby, 'getSelectedChampionIndex').mockReturnValue([1, INDEX_THREE]);

            gateway.getSelectedChampions(socket as unknown as Socket);

            expect(socket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.ChampionSelected, { championsIndex: [1, INDEX_THREE] });
        });
    });

    describe('Lobby Status Checks', () => {
        it('should return true for isLobbyFull when lobby is full', () => {
            const socket2 = createSocketMock(playerId2, [lobbyCode]);
            const fullLobby = new Lobby(mapId, lobbyCode, 1, false);
            fullLobby.addPlayer({ ...mockPlayerInfo, _id: playerId1 });
            gateway['lobbys'].set(lobbyCode, fullLobby);

            gateway.isLobbyFull(socket2 as unknown as Socket, { ...mockPlayerInfo2, _id: playerId2 });

            expect(socket2.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyFull, true);
        });

        it('should return false for isLobbyFull when player is already in lobby', () => {
            const playerSocket = createSocketMock(playerId1, [lobbyCode]);
            const fullLobby = new Lobby(mapId, lobbyCode, 1, false);
            fullLobby.addPlayer({ ...mockPlayerInfo, _id: playerId1 });
            gateway['lobbys'].set(lobbyCode, fullLobby);

            gateway.isLobbyFull(playerSocket as unknown as Socket, { ...mockPlayerInfo, _id: playerId1 });

            expect(playerSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyFull, false);
        });

        it('should return false for isLobbyFull for player with duplicate name', () => {
            const sameNameSocket = createSocketMock(playerId2, [lobbyCode]);
            const fullLobby = new Lobby(mapId, lobbyCode, 1, false);
            const sameName = 'SamePlayerName';
            fullLobby.addPlayer({ ...mockPlayerInfo, _id: playerId1, name: sameName });
            gateway['lobbys'].set(lobbyCode, fullLobby);

            gateway.isLobbyFull(sameNameSocket as unknown as Socket, { ...mockPlayerInfo2, name: sameName });

            expect(sameNameSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyFull, false);
        });
    });

    describe('Lobby Lock Status', () => {
        it('should return false for isLobbyLocked when player is already in lobby', () => {
            server.to = jest.fn().mockReturnValue({ emit: jest.fn() });
            const lockedLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, true);
            lockedLobby.addPlayer({ ...mockPlayerInfo, _id: playerId1 });
            gateway['lobbys'].set(lobbyCode, lockedLobby);

            const playerSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.isLobbyLocked(playerSocket as unknown as Socket, mockPlayerInfo);

            expect(playerSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyLocked, false);
        });

        it('should return true for isLobbyLocked when lobby is locked and player is not in it', () => {
            server.to = jest.fn().mockReturnValue({ emit: jest.fn() });
            const lockedLobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, true);
            gateway['lobbys'].set(lobbyCode, lockedLobby);
            jest.spyOn(lockedLobby, 'hasPlayer').mockReturnValue(false);
            jest.spyOn(lockedLobby, 'isLocked').mockReturnValue(true);

            const playerSocket = createSocketMock(playerId1, [lobbyCode]);
            gateway.isLobbyLocked(playerSocket as unknown as Socket, mockPlayerInfo);

            expect(playerSocket.emit).toHaveBeenCalledWith(LobbyGatewayEvents.IsLobbyLocked, true);
        });
    });

    describe('Game Controls', () => {
        it('should broadcast game start to lobby', () => {
            server.to = jest.fn().mockReturnValue({ emit: jest.fn() });
            const socket = createSocketMock(playerId1, [lobbyCode]);

            gateway.startGame(socket as unknown as Socket);

            expect(server.to).toHaveBeenCalledWith(lobbyCode);
            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.StartGame);
        });

        it('should toggle lobby lock status', () => {
            server.to = jest.fn().mockReturnValue({ emit: jest.fn() });
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
            gateway['lobbys'].set(lobbyCode, lobby);

            jest.spyOn(lobby, 'setLocked');

            gateway.toggleLockLobby(socket as unknown as Socket, true);

            expect(lobby.setLocked).toHaveBeenCalledWith(true);
            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(LobbyGatewayEvents.LobbyLockChanged, lobby);
        });
    });

    describe('Edge Cases', () => {
        it('should handle operations when socket is not in any lobby', () => {
            const socketWithoutLobby = createSocketMock(playerId1);
            gateway.finishChampionSelection(socketWithoutLobby as unknown as Socket, mockPlayerInfo);
            gateway.championSelected(socketWithoutLobby as unknown as Socket, { index: 2 });
            gateway.championDeselected(socketWithoutLobby as unknown as Socket);
            gateway.getSelectedChampions(socketWithoutLobby as unknown as Socket);
            gateway.isLobbyFull(socketWithoutLobby as unknown as Socket, mockPlayerInfo);
            gateway.kickPlayer(socketWithoutLobby as unknown as Socket, playerName1);
            expect(server.to).not.toHaveBeenCalled();
            expect(socketWithoutLobby.to).not.toHaveBeenCalled();
            expect(socketWithoutLobby.emit).not.toHaveBeenCalled();
        });

        it('should handle operations when lobby does not exist', () => {
            const nonExistentLobbyCode = 'nonExistentLobby';
            const socketInRoomWithNoLobby = createSocketMock(playerId1, [nonExistentLobbyCode]);
            gateway['lobbys'].clear();

            socketInRoomWithNoLobby.emit = jest.fn();
            gateway.getSelectedChampions(socketInRoomWithNoLobby as unknown as Socket);

            expect(socketInRoomWithNoLobby.emit).not.toHaveBeenCalled();
        });
    });

    describe('Chat Room Functionality', () => {
        it('should add message to room and broadcast it to all clients', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const testMessage = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'TestSender',
                senderId: playerId1,
                content: 'Hello, this is a test message',
            };
            gateway.handleRoomMessage(socket as unknown as Socket, testMessage);
            expect(baseGatewayService.addMessageToRoom).toHaveBeenCalledWith(lobbyCode, testMessage);
            expect(server.to).toHaveBeenCalledWith(lobbyCode);
            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, testMessage);
        });

        it('should trim message content that exceeds max length', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const longContent = 'A'.repeat(WORD_MAX_LENGTH + OVER_MAX_CARACTER_LIMIT);
            const expectedTrimmedContent = longContent.substring(0, WORD_MAX_LENGTH);

            const originalMessage = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'TestSender',
                senderId: playerId1,
                content: longContent,
            };

            const expectedTrimmedMessage = {
                ...originalMessage,
                content: expectedTrimmedContent,
            };

            gateway.handleRoomMessage(socket as unknown as Socket, originalMessage);
            expect(baseGatewayService.addMessageToRoom).toHaveBeenCalledWith(lobbyCode, expectedTrimmedMessage);
            expect(server.to).toHaveBeenCalledWith(lobbyCode);
            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, expectedTrimmedMessage);
        });

        it('should not modify message with content under max length', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const shortContent = 'Short message';

            const message = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'TestSender',
                senderId: playerId1,
                content: shortContent,
            };

            gateway.handleRoomMessage(socket as unknown as Socket, message);
            expect(baseGatewayService.addMessageToRoom).toHaveBeenCalledWith(lobbyCode, message);
            expect(message.content).toBe(shortContent);
        });

        it('should not process message when socket is not in any room', () => {
            const socketWithoutRoom = createSocketMock(playerId1, []);

            const message = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'TestSender',
                senderId: playerId1,
                content: 'This will not be processed',
            };
            jest.spyOn(baseGatewayService, 'addMessageToRoom');

            gateway.handleRoomMessage(socketWithoutRoom as unknown as Socket, message);
            expect(baseGatewayService.addMessageToRoom).not.toHaveBeenCalled();
            expect(server.to).not.toHaveBeenCalled();
        });

        it('should handle message with empty content', () => {
            const socket = createSocketMock(playerId1, [lobbyCode]);
            const message = {
                timeStamp: '2025-04-13T12:00:00Z',
                senderName: 'TestSender',
                senderId: playerId1,
                content: '',
            };
            gateway.handleRoomMessage(socket as unknown as Socket, message);
            expect(baseGatewayService.addMessageToRoom).toHaveBeenCalledWith(lobbyCode, message);
            expect(server.to).toHaveBeenCalledWith(lobbyCode);
            expect(server.to(lobbyCode).emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomMessage, message);
        });
    });

    describe('Chat History Functionality', () => {
        it('should return chat history for a valid lobby', () => {
            const socket = createSocketMock(playerId1);
            const mockMessages = [
                {
                    timeStamp: '2025-04-13T11:50:00Z',
                    senderName: 'User1',
                    senderId: 'user1-id',
                    content: 'First message',
                },
                {
                    timeStamp: '2025-04-13T11:55:00Z',
                    senderName: 'User2',
                    senderId: 'user2-id',
                    content: 'Second message',
                },
            ];
            baseGatewayService.getMessagesFromRoom = jest.fn().mockReturnValue({
                messages: mockMessages,
            });
            gateway.handleChatHistory(socket as unknown as Socket, lobbyCode);

            expect(baseGatewayService.getMessagesFromRoom).toHaveBeenCalledWith(lobbyCode);
            expect(socket.emit).toHaveBeenCalledWith(CommonGatewayEvents.ChatHistory, mockMessages);
        });

        it('should handle empty message history', () => {
            const socket = createSocketMock(playerId1);

            baseGatewayService.getMessagesFromRoom = jest.fn().mockReturnValue({
                messages: [],
            });

            gateway.handleChatHistory(socket as unknown as Socket, lobbyCode);

            expect(baseGatewayService.getMessagesFromRoom).toHaveBeenCalledWith(lobbyCode);
            expect(socket.emit).not.toHaveBeenCalled(); // Should not emit if history is empty
        });

        it('should handle undefined lobby ID', () => {
            const socket = createSocketMock(playerId1);

            const result = gateway.handleChatHistory(socket as unknown as Socket, undefined);

            expect(result).toEqual({ messages: [] });
            expect(baseGatewayService.getMessagesFromRoom).not.toHaveBeenCalled();
        });

        it('should handle non-existent lobby', () => {
            const socket = createSocketMock(playerId1);
            const nonExistentLobby = 'non-existent-lobby';

            baseGatewayService.getMessagesFromRoom = jest.fn().mockReturnValue(undefined);

            gateway.handleChatHistory(socket as unknown as Socket, nonExistentLobby);

            expect(baseGatewayService.getMessagesFromRoom).toHaveBeenCalledWith(nonExistentLobby);
            expect(socket.emit).not.toHaveBeenCalled();
        });
    });
});
