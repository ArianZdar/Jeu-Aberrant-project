export interface PlayerInfo {
    _id: string;
    name: string;
    championIndex: number;
    healthPower: number;
    attackPower: number;
    defensePower: number;
    speed: number;
    isReady: boolean;
    isAlive: boolean;
    isWinner: boolean;
    isDisconnected: boolean;
    isBot: boolean;
    isAggressive: boolean;
    isLeader: boolean;
}
