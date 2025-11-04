/* eslint-disable @typescript-eslint/no-magic-numbers */

import { PlayerInfo } from '@common/player/player-info';
import { FakeLobby } from './fake-lobby';
import { Lobby } from './lobby';

describe('Lobby', () => {
    const PIN_LENGTH = 4;
    const NB_PLAYERS = 4;
    const MAX_PLAYERS = 6;
    const ID_LENGTH = 24;
    let lobby: Lobby;
    let mockPlayerInfo: PlayerInfo;
    let mapId: string;
    let lobbyCode: string;
    let playerId1: string;
    let playerId2: string;
    let playerName1: string;

    beforeEach(() => {
        const mockData = FakeLobby.createMockLobbyData();
        mapId = mockData.mapId;
        lobbyCode = mockData.lobbyCode;
        playerId1 = mockData.playerId1;
        playerId2 = mockData.playerId2;
        playerName1 = mockData.playerName1;
        mockPlayerInfo = mockData.mockPlayerInfo;

        lobby = new Lobby(mapId, lobbyCode, NB_PLAYERS, false);
    });

    describe('constructor', () => {
        it('should initialize with correct values', () => {
            expect(lobby.getCode()).toBe(lobbyCode);
            expect(lobby.getMaxPlayers()).toBe(NB_PLAYERS);
            expect(lobby.isLocked()).toBe(false);
            expect(lobby.getMapId()).toBe(mapId);
            expect(lobby.getPlayers()).toEqual([]);
        });
    });

    describe('player management', () => {
        it('should add a player', () => {
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.getPlayers()).toHaveLength(1);
            expect(lobby.getPlayers()[0]).toEqual(mockPlayerInfo);
        });

        it('should remove a player', () => {
            lobby.addPlayer(mockPlayerInfo);
            lobby.removePlayer(playerId1);
            expect(lobby.getPlayers()).toHaveLength(0);
        });

        it('should check if a player exists', () => {
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.hasPlayer(playerId1)).toBe(true);
            expect(lobby.hasPlayer('999')).toBe(false);
        });

        it('should get a player by ID', () => {
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.getPlayer(playerId1)).toEqual(mockPlayerInfo);
            expect(lobby.getPlayer('999')).toBeUndefined();
        });

        it('should get a player by name', () => {
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.getPlayerByName(playerName1)).toEqual(mockPlayerInfo);
            expect(lobby.getPlayerByName('NonExistentPlayer')).toBeUndefined();
        });

        it('should update a player', () => {
            lobby.addPlayer(mockPlayerInfo);
            const updatedPlayer = { ...mockPlayerInfo, isReady: true };
            lobby.updatePlayer(updatedPlayer);
            expect(lobby.getPlayer(playerId1).isReady).toBe(true);
            expect(lobby.getPlayer(playerId1).isLeader).toBe(true);
        });
    });

    describe('lobby state checks', () => {
        it('should check if lobby is empty', () => {
            expect(lobby.isLobbyEmpty()).toBe(true);
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.isLobbyEmpty()).toBe(false);
        });

        it('should check if lobby is full', () => {
            const smallLobby = new Lobby(mapId, lobbyCode, 1, false);
            expect(smallLobby.isLobbyFull()).toBe(false);
            smallLobby.addPlayer(mockPlayerInfo);
            expect(smallLobby.isLobbyFull()).toBe(true);
        });

        it('should check if champion index is taken', () => {
            lobby.addPlayer(mockPlayerInfo);
            expect(lobby.isChampionIndexTaken(0, playerId2)).toBe(true);
            expect(lobby.isChampionIndexTaken(0, playerId1)).toBe(false);
            expect(lobby.isChampionIndexTaken(1, playerId2)).toBe(false);
        });
    });

    describe('lobby properties', () => {
        it('should set and get map ID', () => {
            const newMapId = FakeLobby.generateRandomId(ID_LENGTH);
            lobby.setMapId(newMapId);
            expect(lobby.getMapId()).toBe(newMapId);
        });

        it('should set and get code', () => {
            const newCode = FakeLobby.generateRandomDigits(PIN_LENGTH);
            lobby.setCode(newCode);
            expect(lobby.getCode()).toBe(newCode);
        });

        it('should set and get max players', () => {
            lobby.setMaxPlayers(MAX_PLAYERS);
            expect(lobby.getMaxPlayers()).toBe(MAX_PLAYERS);
        });

        it('should set and get locked status', () => {
            expect(lobby.isLocked()).toBe(false);
            lobby.setLocked(true);
            expect(lobby.isLocked()).toBe(true);
        });
    });

    describe('champion index management', () => {
        it('should add a selected champion index', () => {
            lobby.addSelectedChampionIndex(1);
            expect(lobby.getSelectedChampionIndex()).toContain(1);
        });

        it('should remove a selected champion index', () => {
            lobby.addSelectedChampionIndex(2);
            lobby.removeSelectedChampionIndex(2);
            expect(lobby.getSelectedChampionIndex()).not.toContain(2);
        });

        it('should return a copy of selected champion indices', () => {
            lobby.addSelectedChampionIndex(3);
            const indices = lobby.getSelectedChampionIndex();
            indices.push(99);
            expect(lobby.getSelectedChampionIndex()).not.toContain(99);
        });
    });
});
