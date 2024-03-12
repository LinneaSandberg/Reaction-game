import { Game, Highscore, Player, Room, StartGame, VirusDelay } from "./Models";
export {};

// Events emitted by the server to the client
export interface ServerToClientEvents {
  roomCreated: (event: RoomCreatedEvent) => void;
  waitingForPlayer: (event: WaitingForPlayersEvent) => void;
  virusLogic: (position: number, delay: number) => void;
  virusDelay: (data: VirusDelay) => void;
  playerLeft: (username: string) => void;
  countdown: (seconds: number) => void;
  startGame: () => void;
  virusHitConfirmed: () => void;
  gameOver: () => void;
  reactionTimeForBoth: (elapsedTime: number) => void;
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
  // playerJoinRequest: (username: string, callback: (success: boolean) => void) => void;
  roomForPlayers: (callback: (rooms: Room[]) => void) => void;
  playerJoinRequest: (
    username: string,
    roomId: string,
    callback: (response: PlayerJoinResponse) => void
  ) => void;
  highscore: (callback: (highscores: Highscore[]) => void) => void;
  virusClick: (event: stopTimerEvent) => void;
  gameScore: (callback: (points: Points) => void) => void;
}

export interface GameInfo extends Game {
  players: Player[];
}

export interface PlayerJoinResponse {
  success: boolean;
  game: GameInfo | null;
}

export interface RoomCreatedEvent {
  roomId: string;
  players: Player[];
}

export interface WaitingForPlayersEvent {
  message: string;
}

export interface WaitingPlayers {
  players: Player;
  socketId: string;
}

export interface stopTimerEvent {
  playerId: string;
  elapsedTime: number;
}

export interface UserSocketMap {
  [username: string]: string;
}

export interface PlayerLeftEvent {
  playerId: string;
}

export interface ReactionTimes {
  [playerId: string]: number[];
}

export interface AverageHighscores {
  [playerId: string]: number;
}

export interface Highscores {
  id: string;
  username: string;
  highscore: number;
}

export type Points = Record<string, number>;
