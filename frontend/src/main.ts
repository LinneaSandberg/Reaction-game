import { io, Socket } from "socket.io-client";
import {
	ClientToServerEvents,
	ServerToClientEvents,
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;

// Connect to Socket.IO Server
console.log("Connecting to Socket.IO Server at:", SOCKET_HOST);
const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(SOCKET_HOST);

// Listen for when connection is established
socket.on("connect", () => {
	console.log("💥 Connected to the server", SOCKET_HOST);
	console.log("🔗 Socket ID:", socket.id);
});

// Listen for when server got tired of us
socket.on("disconnect", () => {
	console.log("💀 Disconnected from the server:", SOCKET_HOST);
});

// Listen for when we're reconnected (either due to our or the servers connection)
socket.io.on("reconnect", () => {
	console.log("🍽️ Reconnected to the server:", SOCKET_HOST);
	console.log("🔗 Socket ID:", socket.id);
});

// Create a DOM-refernce for the submit input as HTMLInputElement
const usernameFormEl = document.querySelector(".app") as HTMLFormElement;
const usernameInputEl = document.querySelector(".app") as HTMLInputElement;

// Create varible for username
let username: string | null = null;

// add eventlistner listening for when the form-username is submitted
usernameFormEl.addEventListener("submit", (e) => {
	e.preventDefault();

	// Trim the input-value
	const trimmedUsername = usernameInputEl.value.trim();

	// If no username is written
	if (!trimmedUsername) {
		return;
	}

	// set username
	username = trimmedUsername;

	// Emit `userJoinRequest`-event to the server and wait for acknowledgement
	socket.emit("playerJoinRequest", username, (success) => {
		console.log("Player were able to join!", username, (success));

		if (!success) {
			alert("You can't join!");
			return;
		}

		// Here we call for function that shows player the "waiting to play-room"

	});

	console.log("Emitted 'playerJoinRequest' event to server", username);
});