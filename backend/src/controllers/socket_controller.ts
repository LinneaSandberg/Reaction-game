/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, WaitingPlayers } from "@shared/types/SocketTypes";
import prisma from "../prisma";

// Create a new debug instance
const debug = Debug("backend:socket_controller");

// array of players waiting to play
const waitingPlayers: WaitingPlayers[] = [];


// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	debug("A player got connected 🏁", socket.id);

	// // Listen for room list request
	// socket.on("roomForPlayers", async (callback) => {
	// 	debug("Got request for rooms!");


	// 	// Här ska vi skriva logik för att queria databasen och få ut rum, frågan är då om vi ska ha skapa en massa rum eller om rummet skall skapas när det är två användare som är där?
	// });



	// Listen for player join request
	socket.on("playerJoinRequest", async (username: string) => {
		debug("Player %s want's to join the game!", socket.id);

		// const player = await prisma.player.findMany();

		// console.log("our players: ", player);


		const player = await prisma.player.create({
			data: {
				id: socket.id,
				username,
			},
		});
		debug("Player created: ", player);

		
		waitingPlayers.push({
			players: {
				playerId: socket.id,
				username: username,
			},
			socketId: socket.id,
		});

		if (waitingPlayers.length >= 2) {
			const playersInRoom = waitingPlayers.splice(0, 2);

			const roomId = `room_${Date.now()}`;

			playersInRoom.forEach((player) => {
				io.to(player.socketId).emit("roomCreated", { roomId, players: playersInRoom.map(p => p.players) });
			});
		} else {
			io.to(socket.id).emit("waitingForPlayer", { message: "waiting for another player to join!" });
		}
	

		// callback({
		// 	success: true
		// });
	});



	// handler for disconnecting
	socket.on("disconnect", () => {
		debug("A Player disconnected", socket.id);

		const index = waitingPlayers.findIndex((player) => player.socketId === socket.id);
		if (index !== -1) {
			waitingPlayers.splice(index, 1);
		}
	});

}
