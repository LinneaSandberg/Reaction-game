export {}

export interface Game {
    id: string;
    name: string;
}


export interface Room {
    roomId: string;
    players: Player[];
}

export interface Player {
    playerId: string;
    username: string;
}

export interface VirusPosition {
    position: number;
}

export interface VirusDelay {
    delay: number;
}

export type StartGame = {
    virusPosition: number;
    virusDelay: number;
  };