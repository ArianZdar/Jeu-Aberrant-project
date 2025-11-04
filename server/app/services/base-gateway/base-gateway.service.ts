import { RoomGeneratorService } from '@app/services/room-generator/room-generator.service';
import { CommonGatewayEvents } from '@common/events/gateway-events';
import { ChatMessage, RoomMessages } from '@common/game/message';
import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@Injectable()
export class BaseGatewayService {
    private server: Server;
    private room: string;
    private namespace: string;
    private roomsMessages = new Map<string, RoomMessages>();

    constructor(protected readonly roomGeneratorService: RoomGeneratorService) {}

    setServer(server: Server) {
        this.server = server;
    }

    setNamespace(namespace: string) {
        this.namespace = namespace;
    }

    joinChatRoom(roomId: string) {
        if (!this.roomsMessages.has(roomId)) {
            this.roomsMessages.set(roomId, { messages: [] });
        }
    }

    addMessageToRoom(roomId: string, chatMessage: ChatMessage) {
        const roomMessages = this.roomsMessages.get(roomId);
        if (roomMessages) {
            roomMessages.messages.push(chatMessage);
        }
    }

    getMessagesFromRoom(roomId: string): RoomMessages | undefined {
        return this.roomsMessages.get(roomId);
    }

    joinRoom(socket: Socket) {
        socket.join(this.room);
        socket.emit(CommonGatewayEvents.RoomAssigned, { roomId: this.room, userId: socket.id });
    }

    joinSpecificRoom(socket: Socket, room: string) {
        socket.join(room);
        socket.emit(CommonGatewayEvents.RoomAssigned, { roomId: room, userId: socket.id });
    }

    handleDisconnect(socket: Socket) {
        if (socket.rooms.has(this.room)) {
            this.roomGeneratorService.removeRoom(this.room);
            this.roomsMessages.delete(this.room);
        }
    }
}
