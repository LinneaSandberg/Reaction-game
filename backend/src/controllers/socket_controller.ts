/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import {
	ClientToServerEvents,
	ServerToClientEvents,
	WaitingPlayers,
} from "@shared/types/SocketTypes";
import prisma from "../prisma";
import { deletePlayer, getPlayer } from "../services/PlayerService";
//import { virusPosition } from "./game_controller";

// Create a new debug instance
const debug = Debug("backend:socket_controller");

// array of players waiting to play
const waitingPlayers: WaitingPlayers[] = [];

// Initialize variables for timer state
let isGameRunning = false;
let startTime: number;
let intervalId: NodeJS.Timeout;
export { isGameRunning, startTime, intervalId };

// Handle a user connecting
export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	// debug("A player got connected 🏁", socket.id);

	if (io.engine.clientsCount === 2) {
		moveVirusAutomatically(io);
	}

	function startTimer() {
		if (!isGameRunning) {
			isGameRunning = true;

			startTime = Date.now();

			// Emit a signal to all clients to start their timers
			io.emit("startTimer", startTime);

			// Update timer every millisecond
			intervalId = setInterval(() => {
				const elapsedTime = Date.now() - startTime;
				// io.emit("updateTimer", elapsedTime);
			}, 100);
		}
	}

	function stopTimer(socketId: string) {
		console.log("socketId", socketId);

		const playerClicked = socketId;
		console.log("playerClicked", playerClicked);

		if (isGameRunning) {
			isGameRunning = false;

			// Clear the interval and calculate elapsed time
			clearInterval(intervalId);
			const elapsedTime = Date.now() - startTime;

			// Emit a signal to all clients to stop their timers
			io.emit("stopTimer", {
				playerId: socket.id,
				elapsedTime,
			});
			// }
		}
	}

	socket.on("startTimer", () => {
		startTimer();
	});

	socket.on("updateTimer", () => {});

	function moveVirusAutomatically(
		io: Server<ClientToServerEvents, ServerToClientEvents>
	) {
		const moveVirus = () => {
			const newVirusPosition = virusPosition();
			io.emit("virusPosition", newVirusPosition); // Emit new position to all clients

			const delay = virusDelay();
			setTimeout(moveVirus, delay);

			// debug(`Virus will move in ${delay}ms`);
			// startTimer();
			// debug("Starting timer");
		};

		moveVirus(); // Start moving the virus
	}

	function virusPosition(): number {
		return Math.floor(Math.random() * 25);
	}

	function virusDelay(): number {
		return Math.floor(Math.random() * 9001) + 1000;
	}

	const initialVirusPosition = virusPosition();
	socket.emit("virusPosition", initialVirusPosition);

	// Handling a virus hit from a client
	socket.on("hitVirus", () => {
		stopTimer(socket.id);

		// Calculate and emit new virus position
		const newVirusPosition = virusPosition();
		io.emit("virusPosition", newVirusPosition);
		virusDelay();
	});

	// Listen for player join request
	socket.on("playerJoinRequest", async (username: string) => {
		// debug("Player %s want's to join the game!", socket.id);

		const player = await prisma.player.create({
			data: {
				id: socket.id,
				username,
			},
		});
		// debug("Player created: ", player);

		waitingPlayers.push({
			players: {
				playerId: socket.id,
				username: username,
			},
			socketId: socket.id,
		});

		if (waitingPlayers.length >= 2) {
			const playersInRoom = waitingPlayers.splice(0, 2);

			// Create a Game in MongoDB and retrive the room/game ID
			const room = await prisma.game.create({
				data: {
					players: {
						connect: playersInRoom.map((p) => ({
							id: p.players.playerId,
						})),
					},
				},
				include: {
					players: true,
				},
			});

			function initiateCountdown(
				io: Server<ClientToServerEvents, ServerToClientEvents>
			) {
				let countdown = 3;
				const countdownInterval = setInterval(() => {
					io.emit("countdown", countdown);
					countdown--;
					if (countdown < -1) {
						// Wait one interval after reaching 0 before clearing
						clearInterval(countdownInterval);
						setTimeout(() => {
							io.emit("startGame");
						}, 100);
					}
				}, 1000);
			}

			const roomId = room.id;
			initiateCountdown(io);
			playersInRoom.forEach((player) => {
				io.to(player.socketId).emit("roomCreated", {
					roomId,
					players: playersInRoom.map((p) => p.players),
				});
			});
			// startTimer();
			// debug("Starting timer");
		} else {
			io.to(socket.id).emit("waitingForPlayer", {
				message: "waiting for another player to join!",
			});
		}
	});

	// handler for disconnecting
	socket.on("disconnect", async () => {
		debug("A Player disconnected", socket.id);

		const index = waitingPlayers.findIndex(
			(player) => player.socketId === socket.id
		);
		if (index !== -1) {
			waitingPlayers.splice(index, 1);
		}

		// Find player to know what room that player was in
		const player = await getPlayer(socket.id);

		// If player does not exist, the return
		if (!player) {
			return;
		}

		// Eventuellt en koll som kollar att det har gått 10rundor och isf radera användaren och skicka highscore till databasen

		// Find and remove the player from the room in MongoDB
		if (player.gameId) {
			await prisma.game.update({
				where: {
					id: player.gameId,
				},
				data: {
					players: {
						disconnect: {
							id: socket.id,
						},
					},
				},
			});
		}

		// Remove player after he plays
		await deletePlayer(socket.id);

		// Broadcast a notice to the room that the user has left
		if (player.gameId) {
			io.to(player.gameId).emit("playerLeft", player.username);
		}
	});
};
