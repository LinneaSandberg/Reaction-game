import { io, Socket } from "socket.io-client";
import {
	ClientToServerEvents,
	RoomCreatedEvent,
	ServerToClientEvents,
	WaitingForPlayersEvent,
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;

const gridItems = document.querySelectorAll(".grid-item") as NodeListOf<Element>;
const virus = document.querySelector(".virus") as HTMLDivElement;
const timeLeft = document.querySelector("#time-left") as HTMLDivElement;
const score = document.querySelector(".score") as HTMLDivElement;

// display or no-display
const startPageEl = document.querySelector("#startPage") as HTMLElement;
const lobbyPageEl = document.querySelector("#lobbyPage") as HTMLElement;
const gamePageEl = document.querySelector("#gamePage") as HTMLElement;



// start game 
const startPageFormEl = document.querySelector(".startPageForm") as HTMLFormElement;
const usernameInputEl = document.querySelector("#usernameInput") as HTMLInputElement;

let result = 0;
let timer;
let startTime = 0;

function shuffleArray(array: Element[]): Element[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function randomSquare() {
    // Remove "virus" class from all squares
    gridItems.forEach((gridItem) => {
        gridItem.classList.remove("virus");
    });

    // Shuffle the array of grid items
    const shuffledGridItems = shuffleArray(Array.from(gridItems));
    
    // Add "virus" class to the first item of the shuffled array
    shuffledGridItems[0].classList.add("virus");
}

function moveVirus() {
	randomSquare();
	const delay = Math.random() * 10000;
	setTimeout(moveVirus, delay);
	console.log(delay);

	startTime = new Date().getTime();
	timer = setInterval(updateTimer, 10);
}
moveVirus();

const updateTimer = () => {

	const player1pEl = document.querySelector("#player1p") as HTMLParagraphElement;
	const player2pEl = document.querySelector("#player2p") as HTMLParagraphElement;



	const currentTime = new Date().getTime();
	const passedTime = currentTime - startTime;

	
}


// Add event listener to each grid item to remove virus on click.
gridItems.forEach((gridItem) => {
	gridItem.addEventListener("mousedown", () => {
		if (gridItem.classList.contains("virus")) {
			gridItem.classList.remove("virus");
			console.log("Virus hit!💥");
			/* result++;
			score.textContent += `${result}`; */
		}
	});
});

// Show waiting room
const showWaitingRoom = () => {
	startPageEl.classList.add("hide");
	lobbyPageEl.classList.remove("hide");
}

const showGameRoom = () => {
	gamePageEl.classList.remove("hide");
	lobbyPageEl.classList.add("hide");
}

// insert usersnames to results
const usernamesDisplay = (username: string, opponent: string) => {
	const player1 = document.querySelector("#player1") as HTMLHeadingElement;
	const player2 = document.querySelector("#player2") as HTMLHeadingElement;

	player1.innerText = `${username}`;
	player2.innerText = opponent || "Opponent";
}

/*

const handlePlayerJoinRequestCallback = (response: PlayerJoinRequest) => {
	console.log("Join was successfull", response);

	if (!response.success) {
		alert("could not join the room");
		return;
	}

	showWaitingRoom();
}
*/


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

// Create varible for username
let username: string | null = null;
let highScore = 0;

// add eventlistner listening for when the form-username is submitted
startPageFormEl.addEventListener("submit", (e) => {
	e.preventDefault();

	console.log("It works to click the button!");

	// Trim the input-value
	const trimmedUsername = usernameInputEl.value.trim();

	// If no username is written
	if (!trimmedUsername) {
		return;
	}

	// set username
	username = trimmedUsername;




	// Emit `playerJoinRequest`-event to the server and wait for acknowledgement
	socket.emit("playerJoinRequest", username, (response) => {
		if (response.success) {
			console.log("Player joined successfully!");
		} else {
			console.error("Player join failed!");
		}
	});
	console.log("Emitted 'playerJoinRequest' event to server", username);

	// function to display the waiting-lobby
	showWaitingRoom();


	socket.on("roomCreated", (event: RoomCreatedEvent) => {
		console.log("Room created: ", event.roomId, "With players: ", event.players);

		const opponent = event.players.find(player => player.username !== username)?.username;

		// function to display the game-room
		showGameRoom();
		if (username && opponent) {
			usernamesDisplay(username, opponent);
		}

	});

	socket.on("waitingForPlayer", (event: WaitingForPlayersEvent) => {
		console.log(event.message);
	})

});