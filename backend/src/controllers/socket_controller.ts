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
	ReactionTimes,
	AverageHighscores,
} from "@shared/types/SocketTypes";
import prisma from "../prisma";
import { deletePlayer, findPlayer, getPlayer, getRoomId } from "../services/PlayerService";
import {
	createHighscore,
	getAllHighscores,
} from "../services/HighscoreService";

// Create a new debug instance
const debug = Debug("backend:socket_controller");

// array of players waiting to play
const waitingPlayers: WaitingPlayers[] = [];

// variabler for timer and virus
let player1ClickTime: number | null;
let player2ClickTime: number | null;
const reactionTimes: ReactionTimes = {};

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
	socket.on("playerJoinRequest", async (username, roomId) => {
		// userSocketMap[username] = socket.id;

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
			});
			
			let gameId = game.id;
			console.log("gameId: ", gameId);

			function initiateCountdown(
				io: Server<ClientToServerEvents, ServerToClientEvents>
			) {
				let countdown = 3;
				const countdownInterval = setInterval(() => {
					io.to(gameId).emit("countdown", countdown);
					countdown--;
					if (countdown < -1) {
						// Wait one interval after reaching 0 before clearing
						clearInterval(countdownInterval);
						setTimeout(() => {
								io.to(gameId).emit("startGame");
							// io.emit("startGame");
							//io.emit("virusLogic", virusPosition(), virusDelay());
						}, 100);
					}
				}, 1000);
			}

			playersInRoom.forEach((player) => {
				const playerSocket = io.sockets.sockets.get(player.socketId);
				if (playerSocket) {
					playerSocket.join(gameId);
				}

				// Join room `gameId`
				// socket.join(gameId);
				io.to(gameId).emit("roomCreated", {
					gameId,
					players: playersInRoom.map((p) => p.players),
				});
				console.log("After `Playersinroom` gameId: ", playersInRoom, gameId);
				console.log("After `Playersinroom` players in room: ", game.id);
			});
			initiateCountdown(io);
			startRound(io, gameId);
		} else {
			io.to(roomId).emit("waitingForPlayer", {
				message: "waiting for another player to join!",
			});
		}

		async function startRound(io: Server, gameId: string) {
			const newVirusDelay = virusDelay();
			const newVirusPosition = virusPosition();
			console.log(
				`🐉 Skickar ny virusposition: ${newVirusPosition} från startRound i socket_controller`
			);

			console.log("In startRound, player.gameId: ", gameId);
			io.to(gameId).emit("virusLogic", newVirusPosition, newVirusDelay);
			// io.emit("virusLogic", newVirusPosition, newVirusDelay);
			virusActive = true; // Allow virus to be "hit" again
			virusStartTime = Date.now(); // Update starttime to calculate reactiontime
			// thirtySecTimer(io);

			return gameId;
		}

		function virusPosition(): number {
			return Math.floor(Math.random() * 25);
		}

		//Random virus delay 1-10 seconds
		function virusDelay(): number {
			return Math.floor(Math.random() * 9000) + 1000;
		}

		// Handling a virus hit from a client
		socket.on("virusClick", async ({ playerId, elapsedTime }) => {
			// const playerId: string = socket.id;
			console.log("elapsedTime:", elapsedTime);
			
			// socket.emit("reactionTimeForBoth", elapsedTime);

			if (!reactionTimes[playerId]) {
				reactionTimes[playerId] = [];
			}
			(reactionTimes[playerId] as number[]).push(elapsedTime);
			console.log("reactionTimes", reactionTimes);

			const playerIds = Object.keys(reactionTimes);
			const allPlayersHaveEnoughEntries = playerIds.every(
				(id) => reactionTimes[id].length >= 10
			);

			if (allPlayersHaveEnoughEntries) {
				for (const playerId of playerIds) {
					// Call highscoreCalc for each player
					highscoreCalc(playerId, reactionTimes);
				}
			} else {
				console.log(
					"Inte tillräckligt med reaktionstider för att beräkna highscore."
				);
			}

			console.log("gameId in virusClick", gameId);

			clicksInRound++;
			if (clicksInRound === 2) {
				clicksInRound = 0;
				currentRound++;
				console.log("currentRound", currentRound);
				if (currentRound >= maxRounds) {
					console.log("Triggering Game Over");
					currentRound = 0;
					io.to(gameId).emit("gameOver");
				} else {
					// Proceed to the next round
					console.log(
						"📌New round from virusClick in socket controller"
					);
					// setTimeout(() => {
					startRound(io, gameId);
					// }, 1000);
				}
			}
		});

		const highscoreCalc = (
			playerId: string,
			reactionTimes: ReactionTimes
		) => {
			const averageHighscores: AverageHighscores = {};

			const playerTimes = reactionTimes[playerId];

			const averageTime =
				playerTimes.reduce((sum, time) => sum + time, 0) /
				playerTimes.length;

			averageHighscores[playerId] = averageTime;

			console.log("averageHighscores", averageHighscores);

			saveHighscoresToDatabase(playerId, averageHighscores);
		};

		// Funktion för att spara highscores i databasen
		const saveHighscoresToDatabase = async (
			playerId: string,
			highscore: AverageHighscores
		) => {
			for (const [playerId, playerHighscore] of Object.entries(
				highscore
			)) {
				const player = await getPlayer(playerId);

				if (player) {
					const username = player.username;
					console.log("username ", username);
					console.log("playerHighscore ", playerHighscore);

					if (username) {
						await createHighscore(username, playerHighscore);
					}
				}
			}
		};

		socket.on("highscore", async (callback) => {
			const allHighscores = await getAllHighscores();
			callback(allHighscores);
		});
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

			// const playerGameId = playerLeftInRoom?.players[0].gameId;
			// const playerLeftout = player.id;
			// console.log("PlayerleftOut: ", playerLeftout);

			// Broadcast a notice to the room that the user has left

			// Broadcast a notice to the room that the user has left

			console.log("socket.id på den som är deletead: ", socket.id);
			console.log("player.gameId", player.gameId);

			io.to(player.gameId).emit("playerLeft", player.username);
		}
	});
};
