import { Room } from "./Models";
export {}

// Events emitted by the server to the client
export interface ServerToClientEvents {
}

// Events emitted by the client to the server
export interface ClientToServerEvents {
    playerJoinRequest: (username: string, callback: (success: boolean) => void) => void;
    roomForPlayers: (callback: (rooms: Room[]) => void) => void;
}
