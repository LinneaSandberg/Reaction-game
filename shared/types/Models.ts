export {}


export interface Room {
    roomId: string;
    players: Player[];
}

export interface Player {
    playerId: string;
    username: string;
}