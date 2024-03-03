/**
 * Socket Controller
 */
import Debug from "debug";
import { Server, Socket } from "socket.io";
import { ClientToServerEvents, ServerToClientEvents, WaitingPlayers } from "@shared/types/SocketTypes";
import prisma from "../prisma";
//import { virusPosition } from "./game_controller";

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

	if (io.engine.clientsCount === 2) {
		moveVirusAutomatically(io);
	  }

	  socket.on("hitVirus", () => {
		debug(`Virus hit by ${socket.id}`);
		// licket i front-end ska komma hit från front end och här hanterar vi poängen för spelaren !?
	  });



	  function moveVirusAutomatically(io: Server<ClientToServerEvents, ServerToClientEvents>) {
		const moveVirus = () => {
		  const newVirusPosition = calculateVirusPosition();
		  io.emit("virusPosition", newVirusPosition); // Emit new position to all clients

		  const delay = calculateDelay();
		  setTimeout(moveVirus, delay);
		  debug(`Virus will move in ${delay}ms`);
		};

		moveVirus(); // Start moving the virus
	  }

	function calculateVirusPosition(): number {
		// Logic to calculate new virus position
		return Math.floor(Math.random() * 25); // Example for a grid of 25 squares
		}

		function calculateDelay(): number {
		// Logic to calculate the delay before the virus moves again
		return Math.random() * 10000; // Random delay up to 10 seconds
		}

	const initialVirusPosition = calculateInitialVirusPosition();
		socket.emit("virusPosition", initialVirusPosition);

		// Handling a virus hit from a client
		socket.on("hitVirus", () => {
		// Update game state as necessary
		debug(`Virus hit by ${socket.id}`);

		// Calculate and emit new virus position
	const newVirusPosition = calculateNewVirusPosition();
		io.emit("virusPosition", newVirusPosition); // Emit to all clients
		});

		// Add more event listeners and logic as needed


	function calculateInitialVirusPosition(): number {
	// Logic to calculate initial virus position
	return Math.floor(Math.random() * 25); // Assuming a grid of 25 squares for example
	}

	function calculateNewVirusPosition(): number {
	// Logic to calculate new virus position after hit
	return Math.floor(Math.random() * 25); // Assuming a grid of 25 squares for example
	}

	// Listen for player join request
	socket.on("playerJoinRequest", async (username: string) => {
		debug("Player %s want's to join the game!", socket.id);


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
