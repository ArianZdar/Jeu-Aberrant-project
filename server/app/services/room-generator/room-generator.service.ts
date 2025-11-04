import { MAX_ROOMS, MAX_ROOMS_ID, ROOM_ID_LENGTH } from '@app/constants/server-constants';
import { Injectable } from '@nestjs/common';

@Injectable()
export class RoomGeneratorService {
    private usedRooms: Set<string> = new Set();

    generateRoom(): string {
        if (this.usedRooms.size >= MAX_ROOMS) {
            throw new Error('No available rooms left');
        }

        let room: string;
        do {
            room = Math.floor(Math.random() * MAX_ROOMS_ID)
                .toString()
                .padStart(ROOM_ID_LENGTH, '0');
        } while (this.usedRooms.has(room));

        this.usedRooms.add(room);
        return room;
    }

    removeRoom(room: string): void {
        this.usedRooms.delete(room);
    }
}
