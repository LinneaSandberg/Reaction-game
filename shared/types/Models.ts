export {};

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

export interface Highscore {
  username: string;
  highscore: number;
}

export interface PastGames {
  username: string;
  score: number | null; 
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
}
