/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import {
	ClientToServerEvents,
	ServerToClientEvents,
	WaitingPlayers,
	UserSocketMap,
} from "@shared/types/SocketTypes";
import prisma from "../prisma";
import { deletePlayer, getPlayer } from "../services/PlayerService";
//import { virusPosition } from "./game_controller";

// Create a new debug instance
const debug = Debug("backend:socket_controller");

// array of players waiting to play
const waitingPlayers: WaitingPlayers[] = [];

// variabler for timer and virus
let player1ClickTime: number | null;
let player2ClickTime: number | null;

// Initialize variables for timer state
let isGameRunning = false;
let startTime: number;
let intervalId: NodeJS.Timeout;
let timeoutTimer: NodeJS.Timeout;
export { isGameRunning, startTime, intervalId };

// Object to store relation between user and socketId
let userSocketMap: UserSocketMap = {};

//Game variables
let currentRound = 0;
const maxRounds = 10;
let virusActive = false;
let virusStartTime: number;

export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	socket.on("playerJoinRequest", async (username: string) => {
		userSocketMap[username] = socket.id;

		const player = await prisma.player.create({
			data: {
				id: socket.id,
				username,
			},
		});

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
				newRound(io);
			});
		} else {
			io.to(socket.id).emit("waitingForPlayer", {
				message: "waiting for another player to join!",
			});
		}
	});

	function stopTimer(socketId: string) {
		console.log("socketId", socketId);

		const playerClicked = socketId;
		console.log("playerClicked", playerClicked);

		if (isGameRunning) {
			isGameRunning = false;
			// console.log("startTime i stopTimer function", startTime);

			// Clear the interval and calculate elapsed time
			clearInterval(intervalId);
			const elapsedTime = Date.now() - startTime;
			console.log("elapsedTime stopTimer function", elapsedTime);

			// Emit a signal to all clients to stop their timers
			io.emit("stopTimer", {
				playerId: socketId,
				elapsedTime,
			});
			// }
		}
	}

	socket.on("startTimer", () => {
		if (!isGameRunning) {
			isGameRunning = true;

			startTime = Date.now();

			// Emit a signal to all clients to start their timers
			// io.emit("startTimer");

			// Update timer every millisecond
			intervalId = setInterval(() => {
				const elapsedTime = Date.now() - startTime;
				io.emit("startTimer", elapsedTime);
			}, 100);
		}
	});

	// socket.on("updateTimer", () => {});

	function startGame(io: Server<ClientToServerEvents, ServerToClientEvents>) {
		const newVirusPosition = virusPosition();
		console.log(`Skickar ny virusposition: ${newVirusPosition}`);
		io.emit("virusPosition", newVirusPosition); // Inform players about the new position

		// io.emit("startTimer");

		virusActive = true; // Allow virus to be "hit" again
		virusStartTime = Date.now(); // Update starttime to calculate reactiontime

		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTimer = setTimeout(() => {
			console.log("Uteblivet klick inom 30 sek.🐌");
			newRound(io);
			currentRound++;
			console.log(currentRound);
		}, 30000);
	}

	function virusPosition(): number {
		return Math.floor(Math.random() * 25);
	}

	function newRound(io: Server) {
		if (currentRound < maxRounds) {
			currentRound++;
			startGame(io);
			console.log(currentRound);
		} else {
			endGame(io);
		}
	}

	function endGame(io: Server) {
		io.emit("gameOver");
		currentRound = 0;
	}

	// Handling a virus hit from a client
	socket.on("hitVirus", () => {
		handleVirusHit(socket.id, io);
		stopTimer(socket.id);
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

	function handleVirusHit(
		socketId: string,
		io: Server<ClientToServerEvents, ServerToClientEvents>
	) {
		if (!virusActive) return;
		clearTimeout(timeoutTimer);
		virusActive = false; // Förhindra fler träffar tills nästa runda startar
		const clickTime = Date.now();
		const reactionTime = clickTime - virusStartTime;

		// stopTimer(socketId);

		// io.emit("playerClicked", { playerId: socketId, reactionTime });
		currentRound++;
		console.log(currentRound);
		if (currentRound < maxRounds) {
			startNewRound(io);
		} else {
			endGame(io);
		}
	}

	function startNewRound(
		io: Server<ClientToServerEvents, ServerToClientEvents>
	) {
		let delay = Math.floor(Math.random() * 9000) + 1000; // 1 till 10 sekunder
		setTimeout(() => {
			virusStartTime = Date.now();
			virusActive = true;
			let position = Math.floor(Math.random() * 25);
			io.emit("virusPosition", position);
		}, delay);
	}
};
