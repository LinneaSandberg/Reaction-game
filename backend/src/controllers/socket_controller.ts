/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import {
	ClientToServerEvents,
	ServerToClientEvents,
	WaitingPlayers,
	ReactionTimes,
	AverageHighscores,
} from "@shared/types/SocketTypes";
import prisma from "../prisma";
import { deletePlayer, findPlayer, findPlayersInGame, getPlayer } from "../services/PlayerService";
import {
	createHighscore,
	getAllHighscores,
} from "../services/HighscoreService";
import { stringify } from "querystring";

const debug = Debug("backend:socket_controller");

// array of players waiting to play
const waitingPlayers: WaitingPlayers[] = [];

// object of reactiontimes
const reactionTimes: ReactionTimes = {};

// initialize variables for timer state
let isGameRunning = false;
let startTime: number;
let intervalId: NodeJS.Timeout;
let timeoutTimer: NodeJS.Timeout;
export { isGameRunning, startTime, intervalId };

// game variables
const maxRounds = 10;
let clicksInRound = 0;
let virusActive = false;
let virusStartTime: number;
let socketToGameMap: Record<string, string> = {};
let gameStateMap: Record<
	string,
	{ currentRound: number; clicksInRound: number; virusActive: boolean }
> = {};

export const handleConnection = (
	socket: Socket<ClientToServerEvents, ServerToClientEvents>,
	io: Server<ClientToServerEvents, ServerToClientEvents>
) => {
	socket.on("playerJoinRequest", async (username) => {
		const existingPlayer = await prisma.player.findUnique({
			where: {
				id: socket.id,
			},
		});

		let player;

		if (existingPlayer) {
			player = existingPlayer;
		} else {
			player = await prisma.player.create({
				data: {
					id: socket.id,
					username,
				},
			});
		}

		for (const playerId in reactionTimes) {
			if (reactionTimes.hasOwnProperty(playerId)) {
			  delete reactionTimes[playerId];
			}
		}

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

			console.log("Gamne: ", game);

			let gameId = game.id;

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
							startRound(io, gameId);
						}, 100);
					}
				}, 1000);
			}

			playersInRoom.forEach((player) => {
				const playerSocket = io.sockets.sockets.get(player.socketId);
				let gameId = game.id;

				if (playerSocket) {
					playerSocket.join(gameId);
					socketToGameMap[player.socketId] = gameId;
				}

				console.log("After `Playersinroom` gameId: ", gameId);
				console.log("After `Playersinroom` players in room: ", game.id);
			});
			io.to(gameId).emit("roomCreated", {
				gameId,
				players: playersInRoom.map((p) => p.players),
			});
			initiateCountdown(io);
		} else {
			socket.emit("waitingForPlayer", {
				message: "waiting for another player to join!",
			});
		}
	});

	function startRound(io: Server, gameId: string) {
		if (!gameStateMap[gameId]) {
			gameStateMap[gameId] = {
				currentRound: 1,
				clicksInRound: 0,
				virusActive: false,
			};
		} else {
			// Increment round or handle game continuation logic
			gameStateMap[gameId].currentRound++;
			gameStateMap[gameId].clicksInRound = 0; // Reset for new round
			gameStateMap[gameId].virusActive = true; // Ensure virus is active for new round
			console.log(
				"📌New round from startRound in socket controller",
				gameStateMap[gameId].clicksInRound
			);
		}
		const newVirusDelay = virusDelay();
		const newVirusPosition = virusPosition();
		console.log(
			`🐉 Skickar ny virusposition: ${newVirusPosition} från startRound i socket_controller`
		);

		console.log("In startRound, player.gameId: ", gameId);
		io.to(gameId).emit("virusLogic", newVirusPosition, newVirusDelay);
		virusActive = true; // Allow virus to be "hit" again
		virusStartTime = Date.now(); // Update starttime to calculate reactiontime
		// thirtySecTimer(io);
	}

	// random virus position
	function virusPosition(): number {
		return Math.floor(Math.random() * 25);
	}

	// random virus delay 1-10 seconds
	function virusDelay(): number {
		return Math.floor(Math.random() * 9000) + 1000;
	}

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

	// function for saving highscores in database
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
	// const points: Record<string, number> = {};

	const calculatePoints = async (
		player1: string,
		player2: string,
		reactionTimes: ReactionTimes,
	) => {
		const points: Record<string, number> = {};

		const reactionTimesPlayer1 = reactionTimes[player1];
		const reactionTimesPlayer2 = reactionTimes[player2];

		console.log("reactionTimesPlayer1: ", reactionTimesPlayer1);
		console.log("reactionTimesPlayer2: ", reactionTimesPlayer2);



		for (let round = 0; round < maxRounds; round++) {
			let fastestTime = Infinity;
			let fastestPlayerId = "";

			for (const id in reactionTimes) {
				const playerTimes = reactionTimes[id];

				if (
					playerTimes.length > round &&
					playerTimes[round] < fastestTime
				) {
					fastestTime = playerTimes[round];
					fastestPlayerId = id;
				}
			}

			if (fastestPlayerId) {
				if (!points[fastestPlayerId]) {
					points[fastestPlayerId] = 0;
				}

				points[fastestPlayerId] += 1; // Award one point to the player with the fastest reaction time in the current round
			}
		}

		for (const [playerId, playerPoints] of Object.entries(points)) {
			const player = await getPlayer(playerId);

			if (player) {
				const username = player.username;
				console.log("username ", username);
				console.log("playerPoints ", playerPoints);

				// if (username) {
				// 	await createHighscore(username, playerHighscore);
				// }

				console.log("playerId", playerId);
				console.log("points", points);
				// io.emit("gameScore", points);
				const sokcetId: string = socket.id;
				const gameId = socketToGameMap[socket.id];
				if (gameId) {
					io.to(gameId).emit(
						"gameScore",
						sokcetId,
						playerPoints
						);
					}
				}
		}
	};

	// handling a virus hit from a client
		socket.on("virusClick", async ({ elapsedTime }) => {
			const playerId: string = socket.id;
			const gameId = socketToGameMap[socket.id];
			if (gameId) {
				io.to(gameId).emit(
					"opponentReactionTime",
					playerId,
					elapsedTime
				);
			}
			if (!gameId || !gameStateMap[gameId]) {
				console.error("Game ID not found for socket:", socket.id);
				return; // Handle this error as appropriate
			}
			console.log(
				`Game ID for virusClick: ${gameId}, Current Round: ${gameStateMap[gameId].currentRound}`
			);
			console.log("elapsedTime:", elapsedTime);

			if (!reactionTimes[playerId]) {
				reactionTimes[playerId] = []; // flytta denna rad tll playerjoinrequest innan vi kollar om det finns två spelare
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
			clicksInRound++;
			if (clicksInRound === 2) {
				// player on reactiontimes and player one socket.id, player two reaction times and player two socket.id OSV!
				// behöver ta emot allas playerId
				// använd gameId

				const players = await findPlayersInGame(gameId);
				console.log("Player 1 in game: ", players?.players[0].id);
				console.log("Player 2 in game: ", players?.players[1].id);

				if (players) {
					const player1 = players.players[0].id;
					const player2 = players.players[1].id;

					calculatePoints(player1, player2, reactionTimes);
				}

				clicksInRound = 0;
				//currentRound++;
				//console.log("currentRound", currentRound);
				if (gameStateMap[gameId].currentRound >= maxRounds) {
					console.log("Triggering Game Over");
					gameStateMap[gameId].currentRound = 0;
					io.to(gameId).emit("gameOver");
				} else {
					// Proceed to the next round
					console.log(
						"📌New round from virusClick in socket controller", gameStateMap[gameId].currentRound
					);
					startRound(io, gameId);
				}
			}
		});

	socket.on("highscore", async (callback) => {
		const allHighscores = await getAllHighscores();
		callback(allHighscores);
	});

	// handler for disconnecting
	socket.on("disconnect", async () => {
		debug("A Player disconnected", socket.id);

		// Find player to know what room that player was in
		const player = await getPlayer(socket.id);
		console.log("Get players to now the room: ", player);

		// If player does not exist, the return
		if (!player) {
			return;
		}

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

			const playerLeftInRoom = await findPlayer(player.gameId);

			// Remove player after he plays
			const deletedPlayer = await deletePlayer(socket.id);

			io.to(player.gameId).emit("playerLeft", player.username);

		}
	});
};
