import { Player, Room, VirusDelay } from "./Models";
export {};

// Events emitted by the server to the client
export interface ServerToClientEvents {
  roomCreated: (event: RoomCreatedEvent) => void;
  waitingForPlayer: (event: WaitingForPlayersEvent) => void;
  virusPosition: (position: number) => void;
  virusDelay: (data: VirusDelay) => void;
  startTimer: (startTime: number) => void;
  stopTimer: (event: stopTimerEvent) => void;
  updateTimer: (elapsedTime: number) => void;
  playerLeft: (username: string) => void;
  countdown: (seconds: number) => void;
  startGame: () => void;
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
  // playerJoinRequest: (username: string, callback: (success: boolean) => void) => void;
  roomForPlayers: (callback: (rooms: Room[]) => void) => void;
  playerJoinRequest: (
    username: string,
    callback: (response: PlayerJoinResponse) => void
  ) => void;
  hitVirus: () => void;
  startTimer: () => void; // New event for starting the game
  stopTimer: (username: string) => void; // New event for stopping the game
  updateTimer: (elapsedTime: number, playerId: string) => void;
}

// export interface PlayerJoinRequest {
//     username: string;
//     highScore: number;
// }

export interface PlayerJoinResponse {
  success: boolean;
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
