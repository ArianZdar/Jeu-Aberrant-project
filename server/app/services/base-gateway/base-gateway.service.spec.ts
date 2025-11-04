import { RoomGeneratorService } from '@app/services/room-generator/room-generator.service';
import { CommonGatewayEvents } from '@common/events/gateway-events';
import { ChatMessage } from '@common/game/message';
import { Test, TestingModule } from '@nestjs/testing';
import { Server, Socket } from 'socket.io';
import { BaseGatewayService } from './base-gateway.service';

describe('BaseGatewayService', () => {
    let service: BaseGatewayService;
    let mockServer: Partial<Server>;
    let mockSocket: Partial<Socket>;

    let roomGeneratorServiceMock: Partial<RoomGeneratorService>;

    const mockRoomId = 'room-123';
    const mockUserId = 'user-123';

    const mockChatMessage: ChatMessage = {
        timeStamp: '2023-04-13T14:30:00Z',
        senderName: 'Test User',
        senderId: mockUserId,
        content: 'Hello World!',
    };

    beforeEach(async () => {
        mockServer = {
            emit: jest.fn(),
            to: jest.fn().mockReturnThis(),
        };

        mockSocket = {
            id: mockUserId,
            join: jest.fn(),
            leave: jest.fn(),
            emit: jest.fn(),
            rooms: new Set([mockUserId, mockRoomId]),
        };

        roomGeneratorServiceMock = {
            generateRoom: jest.fn().mockReturnValue(mockRoomId),
            removeRoom: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [BaseGatewayService, { provide: RoomGeneratorService, useValue: roomGeneratorServiceMock }],
        }).compile();

        service = module.get<BaseGatewayService>(BaseGatewayService);
        service.setServer(mockServer as Server);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('setServer', () => {
        it('should set the server instance', () => {
            const newServer = { emit: jest.fn() } as unknown as Server;
            service.setServer(newServer);
            expect(service['server']).toEqual(newServer);
        });
    });

    describe('setNamespace', () => {
        it('should set the namespace', () => {
            const namespace = 'test-namespace';
            service.setNamespace(namespace);
            expect(service['namespace']).toEqual(namespace);
        });
    });

    describe('joinChatRoom', () => {
        it('should create a new room entry if it does not exist', () => {
            expect(service.getMessagesFromRoom(mockRoomId)).toBeUndefined();

            service.joinChatRoom(mockRoomId);

            const roomMessages = service.getMessagesFromRoom(mockRoomId);
            expect(roomMessages).toBeDefined();
            expect(roomMessages.messages).toEqual([]);
        });

        it('should not override existing room messages', () => {
            service.joinChatRoom(mockRoomId);

            service.addMessageToRoom(mockRoomId, mockChatMessage);

            service.joinChatRoom(mockRoomId);

            const roomMessages = service.getMessagesFromRoom(mockRoomId);
            expect(roomMessages).toBeDefined();
            expect(roomMessages.messages).toHaveLength(1);
            expect(roomMessages.messages[0]).toEqual(mockChatMessage);
        });
    });

    describe('addMessageToRoom', () => {
        it('should add a message to an existing room', () => {
            service.joinChatRoom(mockRoomId);

            service.addMessageToRoom(mockRoomId, mockChatMessage);

            const roomMessages = service.getMessagesFromRoom(mockRoomId);
            expect(roomMessages).toBeDefined();
            expect(roomMessages.messages).toHaveLength(1);
            expect(roomMessages.messages[0]).toEqual(mockChatMessage);
        });

        it('should do nothing if room does not exist', () => {
            service.addMessageToRoom('non-existent-room', mockChatMessage);

            expect(service.getMessagesFromRoom('non-existent-room')).toBeUndefined();
        });

        it('should append messages to existing ones', () => {
            service.joinChatRoom(mockRoomId);

            service.addMessageToRoom(mockRoomId, mockChatMessage);

            const secondMessage: ChatMessage = {
                ...mockChatMessage,
                content: 'Second message',
            };
            service.addMessageToRoom(mockRoomId, secondMessage);

            const roomMessages = service.getMessagesFromRoom(mockRoomId);
            expect(roomMessages).toBeDefined();
            expect(roomMessages.messages).toHaveLength(2);
            expect(roomMessages.messages[0]).toEqual(mockChatMessage);
            expect(roomMessages.messages[1]).toEqual(secondMessage);
        });
    });

    describe('getMessagesFromRoom', () => {
        it('should return messages from an existing room', () => {
            service.joinChatRoom(mockRoomId);
            service.addMessageToRoom(mockRoomId, mockChatMessage);

            const roomMessages = service.getMessagesFromRoom(mockRoomId);
            expect(roomMessages).toBeDefined();
            expect(roomMessages.messages).toHaveLength(1);
            expect(roomMessages.messages[0]).toEqual(mockChatMessage);
        });

        it('should return undefined for non-existent rooms', () => {
            const roomMessages = service.getMessagesFromRoom('non-existent-room');
            expect(roomMessages).toBeUndefined();
        });
    });

    describe('joinRoom', () => {
        it('should make socket join the default room and emit RoomAssigned event', () => {
            service['room'] = mockRoomId;

            service.joinRoom(mockSocket as Socket);

            expect(mockSocket.join).toHaveBeenCalledWith(mockRoomId);
            expect(mockSocket.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomAssigned, { roomId: mockRoomId, userId: mockUserId });
        });
    });

    describe('joinSpecificRoom', () => {
        it('should make socket join a specific room and emit RoomAssigned event', () => {
            service.joinSpecificRoom(mockSocket as Socket, mockRoomId);

            expect(mockSocket.join).toHaveBeenCalledWith(mockRoomId);
            expect(mockSocket.emit).toHaveBeenCalledWith(CommonGatewayEvents.RoomAssigned, { roomId: mockRoomId, userId: mockUserId });
        });
    });

    describe('handleDisconnect', () => {
        it('should remove room and its messages when socket disconnects from a registered room', () => {
            service['room'] = mockRoomId;

            service.joinChatRoom(mockRoomId);
            service.addMessageToRoom(mockRoomId, mockChatMessage);

            expect(service.getMessagesFromRoom(mockRoomId)).toBeDefined();

            service.handleDisconnect(mockSocket as Socket);

            expect(roomGeneratorServiceMock.removeRoom).toHaveBeenCalledWith(mockRoomId);
            expect(service.getMessagesFromRoom(mockRoomId)).toBeUndefined();
        });
    });
});
