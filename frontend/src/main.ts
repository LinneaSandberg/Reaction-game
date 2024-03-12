import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  RoomCreatedEvent,
  ServerToClientEvents,
  WaitingForPlayersEvent,
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;

const gridItems = document.querySelectorAll(
  ".grid-item"
) as NodeListOf<Element>;
const displayBoxEl = document.querySelector("#app") as HTMLDivElement;

// display or no-display
const startPageEl = document.querySelector("#startPage") as HTMLElement;
const lobbyPageEl = document.querySelector("#lobbyPage") as HTMLElement;
const countdownPageEl = document.querySelector(
  "#countdownPage"
) as HTMLDivElement;
const countdownTimerEl = document.getElementById(
  "countdownTimer"
) as HTMLDivElement;
const gamePageEl = document.querySelector("#gamePage") as HTMLElement;

// start game
const startPageFormEl = document.querySelector(
  ".startPageForm"
) as HTMLFormElement;
const usernameInputEl = document.querySelector(
  "#usernameInput"
) as HTMLInputElement;

const gameFieldEl = document.querySelector(".game-field") as HTMLDivElement;
const gameOverPageEl = document.querySelector(
  "#game-over-page"
) as HTMLDivElement;

// Result display
// const player1pEl = document.querySelector("#player1p") as HTMLParagraphElement;
const player1TimerEl = document.querySelector(
  "#player1Timer"
) as HTMLParagraphElement;
// const player2pEl = document.querySelector("#player2p") as HTMLParagraphElement;
const player2TimerEl = document.querySelector(
  "#player2Timer"
) as HTMLParagraphElement;
const highscoreChartEl = document.querySelector(
  ".highscoreChart"
) as HTMLUListElement;

// button for reset
const startNewGameFormEl = document.querySelector(
  "#startNewGameForm"
) as HTMLFormElement;

// Connect to Socket.IO Server
console.log("Connecting to Socket.IO Server at:", SOCKET_HOST);
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SOCKET_HOST);


player1TimerEl.innerText = `00:000`;
player2TimerEl.innerText = `00:000`;

let timerIntervalPlayer1: ReturnType<typeof setInterval>;
let timerIntervalPlayer2: ReturnType<typeof setInterval>;
let startTimePlayer1: number;
let roomId: string;

const timer = (timerElement: HTMLElement, startTime: number) => {
  const currentTime = Date.now();
  const passedTime = currentTime - startTime;

  const seconds = Math.floor((passedTime % 60000) / 1000);
  const milliseconds = passedTime % 1000;

  const updatedTime = `${seconds.toString()}:${milliseconds
    .toString()
    .padStart(3, "0")}`;

  timerElement.innerHTML = `${updatedTime}`;

  if (seconds >= 30) {
    clearInterval(timerIntervalPlayer1);

    const reationtime = currentTime - startTime;
    console.log("roomId: ", roomId, "Player reaction Time: ", reationtime);

    // Display result for active player
    if (timerElement === player1TimerEl) {
      console.log("Result for player 1: ", reationtime);
    } else {
      console.log("Result for player 2: ", reationtime);
    }
  }
};

const startTimer = (username: string, playerNumber: string) => {
  console.log("startTimer: ", username);

  // roomId = gameId;

  //startTimePlayer2 = Date.now();

  if (playerNumber === socket.id) {
    startTimePlayer1 = Date.now();
    timerIntervalPlayer1 = setInterval(
      () => timer(player1TimerEl, startTimePlayer1),
      100
    );
  } /* else {
    startTimePlayer2 = Date.now();
    timerIntervalPlayer2 = setInterval(() => 
    timer(player2TimerEl, startTimePlayer2), 100);
  } */
};

const stopTimer = (playerNumber: string) => {
  const elapsedTime = Date.now() - startTimePlayer1;
  // const secoundPlayerElaspsedTime = Date.now() - startTimePlayer2;

  if (playerNumber === socket.id) {
    clearInterval(timerIntervalPlayer1);
    console.log("virusClick: elapsedTime", elapsedTime);
    socket.emit("virusClick", { playerId: socket.id, elapsedTime: elapsedTime });
    // player2TimerEl.innerHTML = `${elapsedTime}`;

  } else {
    clearInterval(timerIntervalPlayer2);
    // player1TimerEl.innerHTML = `${secoundPlayerElaspsedTime}`;
    
  }
};

// Show waiting room
const showWaitingRoom = () => {
  startPageEl.classList.add("hide");
  lobbyPageEl.classList.remove("hide");
};

// Show game
const showGameRoom = () => {
  gamePageEl.classList.remove("hide");
  lobbyPageEl.classList.add("hide");
};

// Show player that the other player left
const showDisconnect = () => {
  console.log("showDisconnect function called.");

  // startPageEl.classList.add("hide");
  gamePageEl.classList.add("hide");
  displayBoxEl.classList.remove("hide");
  // create a DIV element
  const displayEl = document.createElement("div");

  // Set class of that element
  displayEl.classList.add("displayDisconnect");

  // Set content of the DIV element
  displayEl.innerHTML = `
	<h3 id="headerNoob">The other player was a noob!</h3>
  <p id="paraNoob">And left you hanging!</p>
	<figure id="figureNoob">
	<iframe src="https://giphy.com/embed/2kcrRowOHeH9n1EBx6" width="480" height="480" frameBorder="0" class="giphy-embed" id="giphyNoob" allowFullScreen></iframe>
	</figure>
  <form id="startNewGameForm">
  <button id="startGame-submit" type="submit">Play again!</button>
  </form>
	`;

  // Append the DIV element to the page
  displayBoxEl.appendChild(displayEl);
};

// insert usersnames to results
const usernamesDisplay = (username: string, opponent: string) => {
  const player1 = document.querySelector("#player1") as HTMLHeadingElement;
  const player2 = document.querySelector("#player2") as HTMLHeadingElement;

  player1.innerText = `${username}`;
  player2.innerText = opponent || "Opponent";
};

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

socket.emit("highscore", (highscores) => {
  highscoreChartEl.innerHTML = highscores
    .slice(0, 5)
    .map(
      (highscore) => `<li>${highscore.username}: ${highscore.highscore}</li>`
    )
    .join("");
});

socket.on("playerLeft", (username) => {
  console.log("A user has left the game: ", username);

  // Send that information to the other player in the room
  showDisconnect();
});

if (startNewGameFormEl) {
  startNewGameFormEl.addEventListener("submit", (e) => {
    e.preventDefault();

    showWaitingRoom();
  });
}

// Create varible for username
let username: string | null = null;

// add eventlistner listening for when the form-username is submitted
startPageFormEl.addEventListener("submit", (e) => {
  e.preventDefault();

  // console.log("It works to click the button!");

  // Trim the input-value
  const trimmedUsername = usernameInputEl.value.trim();

  // If no username is written
  if (!trimmedUsername) {
    return;
  }

  // set username
  username = trimmedUsername;

  // Emit `playerJoinRequest`-event to the server and wait for acknowledgement
  socket.emit("playerJoinRequest", username, roomId);
  console.log("Emitted 'playerJoinRequest' event to server", username, roomId);

  // function to display the waiting-lobby
  showWaitingRoom();

  socket.on("roomCreated", (event: RoomCreatedEvent) => {
    console.log(
      "Room created: ",
      event.gameId,
      "With players: ",
      event.players
    );

    const opponent = event.players.find(
      (player) => player.username !== username
    )?.username;

    // function to display the game-room
    showGameRoom();

    if (username && opponent) {
      usernamesDisplay(username, opponent);
    }
  });

  socket.on("waitingForPlayer", (event: WaitingForPlayersEvent) => {
    console.log(event.message);
  });
});

socket.on("countdown", (seconds) => {
  if (seconds > 0) {
    countdownPageEl.style.display = "flex";
    countdownTimerEl.innerHTML = `Game starts in </br> ${seconds}`;
  } else {
    countdownTimerEl.innerHTML = "Goo!";
  }
});

socket.on("startGame", () => {
  countdownPageEl.style.display = "none";
  gameFieldEl.style.display = "flex";

  console.log("Game started!");
});

socket.on("reactionTimeForBoth", (elapsedTime: number) => {
  console.log("Detta är elapsedTime från reactionTimeForBoth: ", elapsedTime);
})

socket.on("virusLogic", (position, delay) => {
  console.log(`in viruslogic 🐣New virus position: ${position}`);

  // Remove "virus" class from all grid items
  setTimeout(() => {
    gridItems.forEach((item) => {
      item.classList.remove("virus");
    });

    // Add "virus" class to the new position
    const newPosition = Number(position);
    if (
      !isNaN(newPosition) &&
      newPosition >= 0 &&
      newPosition < gridItems.length
    ) {
      gridItems[newPosition].classList.add("virus");
      if (socket.id && username) {
        startTimer(username, socket.id);
      }
    }
  }, delay);
});

//Add event listener to each grid item to remove virus on click.
gridItems.forEach((gridItem) => {
  gridItem.addEventListener("click", () => {
    //e.preventDefault()
    //e.stopPropagation()
    if (gridItem.classList.contains("virus")) {
      gridItem.classList.remove("virus");
      // socket.emit("stopTimer", "username");
      if (username && socket.id) {
        stopTimer(socket.id);
        // socket.emit("virusClick", username);
        console.log("User som klickade", username, "socketId:", socket.id);
      }
      /* result++;
			score.textContent += `${result}`; */
    }
  });
});

socket.on("gameOver", () => {
  console.log("Spelet är över!");
  gameFieldEl.style.display = "none";
  gameOverPageEl.classList.remove("hide");
  document.querySelector("#play-again")?.addEventListener("click", () => {
    gameOverPageEl.classList.add("hide");
    startPageEl.classList.remove("hide");
  });
  // Visa resultat, erbjuda att starta nytt spel...
});
