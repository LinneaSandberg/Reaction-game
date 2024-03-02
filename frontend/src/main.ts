import { io, Socket } from "socket.io-client";
import {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@shared/types/SocketTypes";
import "./assets/scss/style.scss";

const SOCKET_HOST = import.meta.env.VITE_SOCKET_HOST;

const gridItems = document.querySelectorAll(
  ".grid-item"
) as NodeListOf<Element>;
const virus = document.querySelector(".virus") as HTMLDivElement;
const timeLeft = document.querySelector("#time-left") as HTMLDivElement;
const score = document.querySelector(".score") as HTMLDivElement;

let result = 0;

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
}
moveVirus();

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

// Connect to Socket.IO Server
console.log("Connecting to Socket.IO Server at:", SOCKET_HOST);
const socket: Socket<ServerToClientEvents, ClientToServerEvents> =
  io(SOCKET_HOST);

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
    console.log("Player were able to join!", username, success);

    if (!success) {
      alert("You can't join!");
      return;
    }

    // Here we call for function that shows player the "waiting to play-room"
  });

  console.log("Emitted 'playerJoinRequest' event to server", username);
});

/*
// functions for reactiontime

let startTime: number;
let intervalId: number;
let savedTime: number[] = [];

const timerEl = document.querySelector(".timer") as HTMLElement;
timerEl.innerHTML = `00:000`;

function updateTimer() {
  const currentTime = Date.now();
  const elapsedTime = currentTime - startTime;

  const seconds = Math.floor(elapsedTime / 1000)
    .toString()
    .padStart(2, "0");
  const milliseconds = (elapsedTime % 1000).toString().padStart(3, "0");

  timerEl.innerHTML = `${seconds}:${milliseconds}`;
  // savedTime = elapsedTime;
}

const startTimerEl = document.querySelector(".startTimer") as HTMLButtonElement;
const stopTimerEl = document.querySelector(".stopTimer") as HTMLButtonElement;

const startTimer = () => {
  // Stop timer if it's already going
  stopTimer();

  startTime = Date.now();

  // Återställ savedTime - frågan är om vi vill göra det??
  // savedTime = [];

  // update timer every millisecond
  intervalId = setInterval(updateTimer, 100);
};

const stopTimer = () => {
  if (!Array.isArray(savedTime)) {
    savedTime = [];
  }
  clearInterval(intervalId);

  if (startTime) {
    savedTime.push(Date.now() - startTime);
    console.log("Saved time", savedTime);
  }
  startTime = 0;
  updateHighScore();

  console.log("High Score:", calculateHighScore());
};

// click events for start and stop timer
startTimerEl.addEventListener("click", () => {
  startTimer();
});

stopTimerEl.addEventListener("click", () => {
  stopTimer();
});

// Functions for calculating highscore
function calculateHighScore() {
  // Filter out negative or 0 numbers
  const validTimes = savedTime.filter((time) => time > 0);

  if (validTimes.length === 0) {
    return 0;
  }

  // Calculate average time
  const averageTime =
    validTimes.reduce((sum, time) => sum + time, 0) / validTimes.length;

  return averageTime;
}

let highScore = 0;
const highScoreEl = document.querySelector(".highscore") as HTMLElement;

// Function for updating highscore
function updateHighScore() {
  const currentHighScore = calculateHighScore();

  highScore = currentHighScore;

  console.log("High Score:", highScore);
  highScoreEl.innerHTML = `<p>${highScore}</p>`;
}
*/
