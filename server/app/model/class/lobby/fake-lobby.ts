import { PlayerInfo } from '@common/player/player-info';

interface MockSocket {
    id: string;
    rooms: Set<string>;
    join: jest.Mock;
    leave: jest.Mock;
    to: jest.Mock;
    emit: jest.Mock;
}

interface MockServer {
    to: jest.Mock;
    emit: jest.Mock;
}

const PIN_LENGTH = 4;
const PLAYER_ID_LENGTH = 4;
const ID_LENGTH = 24;
const BASE_POWER = 4;
const MAX_POWER = 6;

export class FakeLobby {
    static generateRandomId(length: number): string {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }

    static generateRandomDigits(length: number): string {
        const digits = '0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += digits.charAt(Math.floor(Math.random() * digits.length));
        }
        return result;
    }

    static createSocketMock(id: string, rooms: string[] = []): MockSocket {
        const roomsSet = new Set([id, ...rooms]);
        return {
            id,
            rooms: roomsSet,
            join: jest.fn(),
            leave: jest.fn(),
            to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            emit: jest.fn(),
        };
    }

    static createServerMock(): MockServer {
        return {
            to: jest.fn().mockReturnValue({ emit: jest.fn() }),
            emit: jest.fn(),
        };
    }

    static createMockLobbyData() {
        const mapId = this.generateRandomId(ID_LENGTH);
        const lobbyCode = this.generateRandomDigits(PIN_LENGTH);
        const playerId1 = this.generateRandomDigits(PLAYER_ID_LENGTH);
        const playerId2 = this.generateRandomDigits(PLAYER_ID_LENGTH);
        const playerName1 = `Player_${this.generateRandomId(PLAYER_ID_LENGTH)}`;
        const playerName2 = `Player_${this.generateRandomId(PLAYER_ID_LENGTH)}`;

        const mockPlayerInfo: PlayerInfo = {
            _id: playerId1,
            name: playerName1,
            championIndex: 0,
            healthPower: MAX_POWER,
            attackPower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            defensePower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            speed: BASE_POWER,
            isReady: false,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
            isLeader: true,
        };

        const mockPlayerInfo2: PlayerInfo = {
            _id: playerId2,
            name: playerName2,
            championIndex: 1,
            healthPower: BASE_POWER,
            attackPower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            defensePower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            speed: MAX_POWER,
            isReady: false,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
            isLeader: false,
        };

        const baseGatewayService = {
            setNamespace: jest.fn(),
            setServer: jest.fn(),
            joinSpecificRoom: jest.fn(),
            handleConnection: jest.fn(),
            handleDisconnect: jest.fn(),
        };

        const roomGeneratorService = {
            generateRoom: jest.fn().mockReturnValue(lobbyCode),
        };

        const botManagerService = {
            createBot: jest.fn().mockReturnValue(this.createAdditionalPlayer(2)),
        };

        return {
            mapId,
            lobbyCode,
            playerId1,
            playerId2,
            playerName1,
            playerName2,
            mockPlayerInfo,
            mockPlayerInfo2,
            baseGatewayService,
            roomGeneratorService,
            botManagerService,
            server: this.createServerMock(),
        };
    }

    static createAdditionalPlayer(index: number): PlayerInfo {
        const playerId = this.generateRandomDigits(PLAYER_ID_LENGTH);
        const playerName = `Player_${this.generateRandomId(PLAYER_ID_LENGTH)}`;

        return {
            _id: playerId,
            name: playerName,
            championIndex: index,
            healthPower: MAX_POWER,
            attackPower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            defensePower: BASE_POWER + Math.floor(Math.random() * MAX_POWER) + 1,
            speed: BASE_POWER,
            isReady: false,
            isAlive: true,
            isWinner: false,
            isDisconnected: false,
            isBot: false,
            isAggressive: false,
            isLeader: false,
        };
    }
}
