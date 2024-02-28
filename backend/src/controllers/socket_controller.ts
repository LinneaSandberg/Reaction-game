/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents } from "@shared/types/SocketTypes";
import prisma from "../prisma";

// Create a new debug instance
const debug = Debug("backend:socket_controller");

// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("A player got connected 🏁", socket.id);

	// Listen for room list request
	socket.on("roomForPlayers", async (callback) => {
		debug("Got request for rooms!");


		// Här ska vi skriva logik för att queria databasen och få ut rum, frågan är då om vi ska ha skapa en massa rum eller om rummet skall skapas när det är två användare som är där?
	});



	// Listen for player join request
	socket.on("playerJoinRequest", (username, callback) => {
		debug("Player %s want's to join the game!", username);


		// here we will alöways let the to waining room and then in to the game if there is to users
		// so now we just let the player in!
		callback(true);
	});



	// handler for disconnecting
	socket.on("disconnect", () => {
		debug("A Player disconnected", socket.id);
	});

}
