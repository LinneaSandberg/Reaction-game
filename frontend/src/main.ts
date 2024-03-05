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
const displayBoxEl = document.querySelector("#app") as HTMLDivElement;

// display or no-display
const startPageEl = document.querySelector("#startPage") as HTMLElement;
const lobbyPageEl = document.querySelector("#lobbyPage") as HTMLElement;
const countdownPageEl = document.querySelector("#countdownPage") as HTMLDivElement
const countdownTimerEl = document.getElementById('countdownTimer') as HTMLDivElement
const gamePageEl = document.querySelector("#gamePage") as HTMLElement;
const gameFieldEl = document.querySelector(".game-field") as HTMLDivElement
// start game 
const startPageFormEl = document.querySelector(".startPageForm") as HTMLFormElement;
const usernameInputEl = document.querySelector("#usernameInput") as HTMLInputElement;

// Show waiting room
const showWaitingRoom = () => {
	startPageEl.classList.add("hide");
	lobbyPageEl.classList.remove("hide");
}

// Show game
const showGameRoom = () => {
	gamePageEl.classList.remove("hide");
	lobbyPageEl.classList.add("hide");
}

// Show player that the other player left
const showDisconnect = () => {

	// create a DIV element
	const displayEl = document.createElement("div");

	// Set class of that element
	displayEl.classList.add("displayDisconnect");

	// Set content of the DIV element 
	displayEl.innerHTML = `
	<h3>The other player was a n00b and left you hanging!</h3>
	<figure>
	<iframe src="https://giphy.com/embed/2kcrRowOHeH9n1EBx6" width="480" height="480" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="https://giphy.com/gifs/therokuchannel-the-roku-channel-this-joka-david-gborie-2kcrRowOHeH9n1EBx6">via GIPHY</a></p>
	</figure>
	`;

	// Append the DIV element to the page
	displayBoxEl.appendChild(displayEl);
}

// insert usersnames to results
const usernamesDisplay = (username: string, opponent: string) => {
	const player1 = document.querySelector("#player1") as HTMLHeadingElement;
	const player2 = document.querySelector("#player2") as HTMLHeadingElement;

	player1.innerText = `${username}`;
	player2.innerText = opponent || "Opponent";
}

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

socket.on("playerLeft", (username) => {
	console.log("A user has left the game: ", username);

	// Send a notice to the other player in the room
	showDisconnect();
	
	// give that other player the option to play atother game
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

  socket.on("countdown", (seconds) => {
	if (seconds > 0) {
	  countdownPageEl.style.display = "flex"; 
	  countdownTimerEl.innerText = `Game starts in ${seconds}...`;
	} else {
	  countdownTimerEl.innerText = "Goo!";
	}
  });
  
  socket.on("startGame", () => {
	countdownPageEl.style.display = "none";
	gameFieldEl.style.display = "flex";
	
	// Initialize or reset your game here
  });
  

socket.on("virusPosition", (position) => {
    console.log(`New virus position: ${position}`);

    // Remove "virus" class from all grid items
    gridItems.forEach((item) => {
        item.classList.remove("virus");
    });

    // Add "virus" class to the new position
    const newPosition = Number(position);
    if (!isNaN(newPosition) && newPosition >= 0 && newPosition < gridItems.length) {
        gridItems[newPosition].classList.add("virus");
    }
});

//Add event listener to each grid item to remove virus on click.

gridItems.forEach((gridItem) => {
	gridItem.addEventListener("mousedown", () => {
		if (gridItem.classList.contains("virus")) {
			gridItem.classList.remove("virus");
			console.log("Virus hit!💥");
			socket.emit("hitVirus"); //Denna gör att "hit" skickas till servern MEN tas bort för båda.
			/* result++;
			score.textContent += `${result}`; */
		}
	});
});