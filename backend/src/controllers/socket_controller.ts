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
import { deletePlayer, findPlayer, getPlayer } from "../services/PlayerService";

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
let clicksInRound = 0;
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
			const game = await prisma.game.create({
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
							//io.emit("virusLogic", virusPosition(), virusDelay());
						}, 100);
					}
				}, 1000);
			}

			const roomId = game.id;
			playersInRoom.forEach((player) => {
				io.to(player.socketId).emit("roomCreated", {
					roomId,
					players: playersInRoom.map((p) => p.players),
				});
				console.log("After `Playersinroom` roomId: ", roomId);
				console.log("After `Playersinroom` players in room: ", game.players);
				// Join room `roomId`
				socket.join(roomId);
			});
			initiateCountdown(io);
			startRound(io);
		} else {
			io.to(socket.id).emit("waitingForPlayer", {
				message: "waiting for another player to join!",
			});
		}
	});

	/* 	function stopTimer(socketId: string) {
		console.log("socketId", socketId);

		const playerClicked = socketId;
		console.log("playerClicked", playerClicked);

		if (isGameRunning) {
			isGameRunning = false;

			// Clear the interval and calculate elapsed time
			clearInterval(intervalId);
			const elapsedTime = Date.now() - startTime;
			console.log("elapsedTime stopTimer function", elapsedTime);

			// Emit a signal to all clients to stop their timers
			io.emit("stopTimer", {
				playerId: socketId,
				elapsedTime,
			});
		}
	} */

	/* 	socket.on("startTimer", () => {
		if (!isGameRunning) {
			isGameRunning = true;

			startTime = Date.now();

			// Update timer every millisecond
			intervalId = setInterval(() => {
				const elapsedTime = Date.now() - startTime;
				io.emit("updateTimer", elapsedTime);
			}, 100);
		}
	}); */

	// socket.on("updateTimer", () => {});

	function startRound(io: Server) {
		const newVirusDelay = virusDelay();
		const newVirusPosition = virusPosition();
		console.log(
			`🐉 Skickar ny virusposition: ${newVirusPosition} från startRound i socket_controller`
		);
		io.emit("virusLogic", newVirusPosition, newVirusDelay);
		virusActive = true; // Allow virus to be "hit" again
		virusStartTime = Date.now(); // Update starttime to calculate reactiontime
		// thirtySecTimer(io);
	}

	function virusPosition(): number {
		return Math.floor(Math.random() * 25);
	}

	//Random virus delay 1-10 seconds
	function virusDelay(): number {
		return Math.floor(Math.random() * 9000) + 1000;
	}

	/* 	function thirtySecTimer(io: Server, remainingTime: number = 30000){
		if (timeoutTimer) clearTimeout(timeoutTimer);
		timeoutTimer = setTimeout(() => {
			console.log("No click within 30 sec.🐌");
			console.log(currentRound);
		}, remainingTime);
	} */

	// function virusSetup(io: Server) {
	// 	//setTimeout(() => {
	// 		virusStartTime = Date.now();
	// 		virusActive = true;
	// 		console.log(`👾Skickar ny virusposition:från virusSetup i socket_controller`)
	// 		//virusPosition();
	// 		io.emit("virusLogic", virusPosition(), virusDelay());
	// 	//}, virusDelay());
	// }

	// Handling a virus hit from a client
	socket.on("virusClick", ({playerId, elapsedTime}) => {
		// const currentPlayer = socket.id;
		// const opponent = waitingPlayers.find(
		// 	(player) => player.socketId !== currentPlayer
		// );
		console.log("elapsedTime:", elapsedTime);
		console.log("playerId:", playerId);

		// console.log("socketId:", socketId)
		socket.emit("reactionTimeForBoth", elapsedTime);

		clicksInRound++;
		if (clicksInRound === 2) {
			clicksInRound = 0;
			currentRound++;
			console.log("currentRound", currentRound);
			if (currentRound >= maxRounds) {
				console.log("Triggering Game Over");
				currentRound = 0;
				io.emit("gameOver");
			} else {
				// Proceed to the next round
				console.log("📌New round from virusClick in socket controller");
				// setTimeout(() => {
					startRound(io);
				// }, 1000);
			}
		}
	});
	// handler for disconnecting
	socket.on("disconnect", async () => {
		debug("A Player disconnected", socket.id);
		

		// const index = waitingPlayers.findIndex(
		// 	(player) => player.socketId === socket.id
		// );
		// if (index !== -1) {
		// 	waitingPlayers.splice(index, 1);
		// }

		// Find player to know what room that player was in
		const player = await getPlayer(socket.id);
		console.log("Get players to now the room: ", player);

		// If player does not exist, the return
		if (!player) {
			return;
		}

		// Eventuellt en koll som kollar att det har gått 10rundor och isf radera användaren och skicka highscore till databasen

		// Find and remove the player from the room in MongoDB
		if (player.gameId) {
			const updatePlayer = await prisma.game.update({
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
			console.log("updateplayer: ", updatePlayer);

		const playerLeftInRoom = await findPlayer(player.gameId);
		console.log("PlayerleftInroom: ", playerLeftInRoom);
		// console.log("playerLeftInRoom.players: ", playerLeftInRoom?.players[0].gameId);


			// Remove player after he plays
		const deletedPlayer = await deletePlayer(socket.id);
		console.log("DeletePlayer: ", deletedPlayer);


		// const playerGameId = playerLeftInRoom?.players[0].gameId;
		// const playerLeftout = player.id;
		// console.log("PlayerleftOut: ", playerLeftout);

		// Broadcast a notice to the room that the user has left
	
			console.log("socket.id på den som är deletead: ", socket.id);
			console.log("player.gameId", player.gameId);

			io.to(player.gameId).emit("playerLeft", player.username);
		}

	});
};
