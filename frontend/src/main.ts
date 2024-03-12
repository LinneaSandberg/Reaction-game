import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  PlayerJoinResponse,
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
const player1pEl = document.querySelector("#player1p") as HTMLParagraphElement;
const player1TimerEl = document.querySelector(
  "#player1Timer"
) as HTMLParagraphElement;
const player2pEl = document.querySelector("#player2p") as HTMLParagraphElement;
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

// const player1ReactiontimeEl = document.querySelector(
//   "#player1Reactiontime"
// ) as HTMLParagraphElement;
// const player2ReactiontimeEl = document.querySelector(
//   "#player2Reactiontime"
// ) as HTMLParagraphElement;

// player1pEl.innerHTML = `00:000`;
// player2pEl.innerHTML = `00:000`;
// let startTime: number;

player1TimerEl.innerText = `00:000`;
player2TimerEl.innerText = `00:000`;

let timerIntervalPlayer1: ReturnType<typeof setInterval>;
let timerIntervalPlayer2: ReturnType<typeof setInterval>;
let startTimePlayer1: number;
let startTimePlayer2: number;
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
    // clearInterval(timerIntervalPlayer2);

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

const handlePlayerJoinRequest = (response: PlayerJoinResponse) => {
  console.log("Join was successfull", response);

  if (!response.success || !response.game) {
		alert("Could not join room (for some reason)");
		return;
	}
}



// Variables for timer and reationtime
// let timerInterval: number | null;
// let reactionTime: number | null;
// let elapsedTime: number = 0;

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

// Update timer to start counting from 0
// const updateTimer = (elapsedTime: number) => {
//   const seconds = Math.floor((elapsedTime % 60000) / 1000);
//   const milliseconds = elapsedTime % 1000;
//   // console.log("elapsedTime", elapsedTime);

//   const formattedTime = `${String(seconds).padStart(2, "0")}:${String(
//     milliseconds
//   ).padStart(3, "0")}`;

//   if (player1TimerEl) {
//     player1TimerEl.innerText = `${formattedTime}`;
//   }

//   if (player2TimerEl) {
//     player2TimerEl.innerText = `${formattedTime}`;
//   }
// };

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

// listen for stopTimer
/* socket.on("stopTimer", ({ playerId, elapsedTime }) => {
  const seconds = Math.floor(elapsedTime / 1000)
    .toString()
    .padStart(2, "0");
  const milliseconds = (elapsedTime % 1000).toString().padStart(3, "0");

  // if (player1pEl && playerId === socket.id) {
  if (playerId === socket.id) {
    player1pEl.innerHTML = `Reactiontime: ${seconds}:${milliseconds}`;
  } else if (playerId !== socket.id) {
    player2pEl.innerHTML = `Reactiontime: ${seconds}:${milliseconds}`;
  }
}); */

// Listen for updateTimer
// socket.on("startTimer", (elapsedTime) => {
//   // Update UI with elapsed time
//   updateTimer(elapsedTime);
// });

socket.on("playerLeft", (username) => {
  console.log("A user has left the game: ", username);

  // Send that information to the other player in the room
  showDisconnect();
});

// socket.on("playerClicked", ({ playerId, reactionTime: playerReactionTime }) => {
//   console.log(`Player ${playerId} clicked on the virus!`);

//   if (timerInterval) {
//     clearInterval(timerInterval);
//     timerInterval = null;
//   }

//   if (playerId === socket.id) {
//     reactionTime = playerReactionTime;

//     // Uppdatera UI med reaktionstiden för spelare 1
//     if (player1ReactiontimeEl) {
//       player1ReactiontimeEl.innerText = `Reaktionstid: ${reactionTime} ms`;
//     }
//   } else {
//     // Uppdatera UI med reaktionstiden för spelare 2
//     if (player2ReactiontimeEl) {
//       player2ReactiontimeEl.innerText = `Reaktionstid: ${playerReactionTime} ms`;
//     }

//     // Update UI with player's reaction time
//     // Implement this function based on your UI structure
//   }
// });

if (startNewGameFormEl) {
  startNewGameFormEl.addEventListener("submit", (e) => {
    e.preventDefault();

    showWaitingRoom();
  });
}

// Create varible for username
let username: string | null = null;
// let highScore = 0;

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
  socket.emit("playerJoinRequest", username, roomId,  handlePlayerJoinRequest);
  console.log("Emitted 'playerJoinRequest' event to server", username);

  // function to display the waiting-lobby
  showWaitingRoom();

  socket.on("roomCreated", (event: RoomCreatedEvent) => {
    console.log(
      "Room created: ",
      event.roomId,
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

  // Initialize or reset your game here
  // console.log("StartTimer i startGame");
  // socket.emit("startTimer");
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

      // console.log("StartTimer i newPosition");
      // socket.emit("startTimer");
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
