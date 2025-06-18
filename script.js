let timer;
let timeLeft;
let currentPhase = "work";
let settings = {
  work: 25,
  shortBreak: 5,
  longBreak: 15,
};
let sounds = {
  whoosh: new Audio("sounds/whoosh.mp3"),
  chime: new Audio("sounds/chime.mp3"),
};
let selectedSound = "whoosh";

const timerDisplay = document.getElementById("timerDisplay");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
const phaseLabel = document.getElementById("phaseLabel");
const settingsButton = document.querySelector(".toggle-settings");
const settingsContent = document.querySelector(".settings-content");
const backgroundSelector = document.getElementById("backgroundSelector");
const soundSelector = document.getElementById("soundSelector");

function updateTimerDisplay() {
  const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
  const seconds = (timeLeft % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
}

function startTimer() {
  clearInterval(timer);
  timer = setInterval(() => {
    if (timeLeft > 0) {
      timeLeft--;
      updateTimerDisplay();
    } else {
      clearInterval(timer);
      sounds[selectedSound].play();
      if (currentPhase === "work") {
        switchPhase("shortBreak", true);
      }
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
}

function resetTimer() {
  clearInterval(timer);
  timeLeft = settings[currentPhase] * 60;
  updateTimerDisplay();
}

function switchPhase(phase, autoStart = false) {
  currentPhase = phase;
  phaseLabel.textContent =
    phase === "work"
      ? "Reading/Productivity"
      : phase === "shortBreak"
      ? "Short Break"
      : "Long Break";
  timeLeft = settings[phase] * 60;
  updateTimerDisplay();
  if (autoStart) startTimer();
}

startBtn.addEventListener("click", startTimer);
pauseBtn.addEventListener("click", pauseTimer);
resetBtn.addEventListener("click", resetTimer);

settingsButton.addEventListener("click", () => {
  settingsContent.classList.toggle("hidden");
});

document.querySelectorAll(".set-timer button").forEach((btn) => {
  btn.addEventListener("click", () => {
    switchPhase(btn.dataset.timer);
  });
});

document.getElementById("saveSettings").addEventListener("click", () => {
  settings.work = parseInt(document.getElementById("workDuration").value) || 25;
  settings.shortBreak = parseInt(
    document.getElementById("shortBreakDuration").value
  ) || 5;
  settings.longBreak = parseInt(
    document.getElementById("longBreakDuration").value
  ) || 15;
  selectedSound = document.getElementById("soundSelector").value;
  document.body.style.backgroundImage = `url('images/${backgroundSelector.value}')`;
  switchPhase(currentPhase);
});

// Spotify Playlist
const spotifyInput = document.getElementById("spotifyInput");
const spotifyContainer = document.getElementById("spotifyContainer");
document.getElementById("loadSpotify").addEventListener("click", () => {
  const url = spotifyInput.value;
  const match = url.match(/playlist\\/([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    const playlistId = match[1];
    spotifyContainer.innerHTML = `<iframe src="https://open.spotify.com/embed/playlist/${playlistId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  }
});

// Nav tab toggle
const navButtons = document.querySelectorAll(".nav-button");
const blocks = document.querySelectorAll(".block");

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (target.classList.contains("hidden")) {
      blocks.forEach((b) => b.classList.add("hidden"));
      target.classList.remove("hidden");
    } else {
      target.classList.add("hidden");
    }
  });
});

// Draggable blocks
blocks.forEach((block) => {
  let isDragging = false;
  let offsetX, offsetY;

  block.addEventListener("mousedown", (e) => {
    if (!e.target.closest(".block-header")) return;
    isDragging = true;
    offsetX = e.clientX - block.offsetLeft;
    offsetY = e.clientY - block.offsetTop;
    block.style.zIndex = 1000;
  });

  document.addEventListener("mousemove", (e) => {
    if (isDragging) {
      block.style.left = `${e.clientX - offsetX}px`;
      block.style.top = `${e.clientY - offsetY}px`;
    }
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
});

// Initial setup
switchPhase("work");
