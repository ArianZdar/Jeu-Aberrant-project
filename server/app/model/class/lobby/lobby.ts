import { PlayerInfo } from '@common/player/player-info';

export class Lobby {
    private code: string;
    private maxPlayers: number;
    private locked: boolean;
    private players: PlayerInfo[];
    private mapId: string;
    private selectedChampionIndices: number[];

    constructor(mapId: string, code: string, maxPlayers: number, locked: boolean) {
        this.locked = locked;
        this.maxPlayers = maxPlayers;
        this.code = code;
        this.mapId = mapId;
        this.players = [];
        this.selectedChampionIndices = [];
    }

    updatePlayer(playerInfo: PlayerInfo): void {
        const index = this.players.findIndex((player) => player._id === playerInfo._id);

        if (index !== -1) {
            const isLeader = this.players[index].isLeader;
            playerInfo.isLeader = isLeader;

            this.players[index] = playerInfo;
        }
    }

    isChampionIndexTaken(championIndex: number, currentPlayerId: string): boolean {
        return this.players.some((player) => player.championIndex === championIndex && player._id !== currentPlayerId);
    }

    getPlayerByName(playerName: string): PlayerInfo {
        return this.players.find((player) => player.name === playerName);
    }

    isLobbyFull(): boolean {
        return this.players.length >= this.maxPlayers;
    }

    addPlayer(player: PlayerInfo): void {
        this.players.push(player);
    }

    removePlayer(playerId: string): void {
        this.players = this.players.filter((player) => player._id !== playerId);
    }

    getPlayer(playerId: string): PlayerInfo {
        return this.players.find((player) => player._id === playerId);
    }

    getPlayers(): PlayerInfo[] {
        return this.players;
    }

    getSelectedChampionIndex(): number[] {
        return [...this.selectedChampionIndices];
    }

    addSelectedChampionIndex(championIndex: number): void {
        this.selectedChampionIndices.push(championIndex);
    }

    removeSelectedChampionIndex(championIndex: number): void {
        this.selectedChampionIndices = this.selectedChampionIndices.filter((index) => index !== championIndex);
    }

    hasPlayer(playerId: string): boolean {
        return this.players.some((player) => player._id === playerId);
    }

    isLobbyEmpty(): boolean {
        return this.players.length === 0;
    }

    getMapId(): string {
        return this.mapId;
    }

    setMapId(mapId: string): void {
        this.mapId = mapId;
    }

    setCode(code: string): void {
        this.code = code;
    }

    getCode(): string {
        return this.code;
    }

    setMaxPlayers(maxPlayers: number): void {
        this.maxPlayers = maxPlayers;
    }

    getMaxPlayers(): number {
        return this.maxPlayers;
    }

    setLocked(locked: boolean): void {
        this.locked = locked;
    }

    isLocked(): boolean {
        return this.locked;
    }
}
