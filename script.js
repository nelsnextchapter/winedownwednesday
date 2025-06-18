// DOM references
const navButtons = document.querySelectorAll(".nav-button");
const blocks = document.querySelectorAll(".block");
const gearIcons = document.querySelectorAll(".gear-icon");
const timerDisplay = document.getElementById("timerDisplay");
const phaseLabel = document.getElementById("phaseLabel");
const backgroundUpload = document.getElementById("backgroundUpload");
const backgroundUrl = document.getElementById("backgroundUrl");

let timer;
let remainingTime = 1500; // 25 minutes
let currentPhase = "work";
let isRunning = false;
let sound = new Audio("whoosh.mp3");

const phaseDurations = {
  work: 1500,
  shortBreak: 300,
  longBreak: 900,
};

const phaseLabels = {
  work: "Reading/Productivity",
  shortBreak: "Break/Chat",
  longBreak: "Short Sprint",
};

function updateDisplay() {
  const minutes = Math.floor(remainingTime / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (remainingTime % 60).toString().padStart(2, "0");
  timerDisplay.textContent = `${minutes}:${seconds}`;
  phaseLabel.textContent = phaseLabels[currentPhase];
}

function startTimer() {
  if (isRunning) return;
  isRunning = true;
  timer = setInterval(() => {
    remainingTime--;
    updateDisplay();
    if (remainingTime <= 0) {
      clearInterval(timer);
      isRunning = false;
      sound.play();
      if (currentPhase === "work") {
        setPhase("shortBreak");
        startTimer();
      }
    }
  }, 1000);
}

function pauseTimer() {
  clearInterval(timer);
  isRunning = false;
}

function resetTimer() {
  pauseTimer();
  remainingTime = phaseDurations[currentPhase];
  updateDisplay();
}

function setPhase(phase) {
  currentPhase = phase;
  remainingTime = phaseDurations[phase];
  updateDisplay();
}

function applySettings() {
  const work = parseInt(document.getElementById("workDuration").value) || 25;
  const shortBreak = parseInt(document.getElementById("shortBreakDuration").value) || 5;
  const longBreak = parseInt(document.getElementById("longBreakDuration").value) || 15;
  phaseDurations.work = work * 60;
  phaseDurations.shortBreak = shortBreak * 60;
  phaseDurations.longBreak = longBreak * 60;

  const selectedSound = document.getElementById("soundSelector").value;
  sound = new Audio(selectedSound);

  const url = backgroundUrl.value.trim();
  const file = backgroundUpload.files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      document.body.style.backgroundImage = `url('${reader.result}')`;
    };
    reader.readAsDataURL(file);
  } else if (url) {
    document.body.style.backgroundImage = `url('${url}')`;
  }

  setPhase(currentPhase);
}

// Event listeners
navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-target");
    blocks.forEach((block) => {
      block.classList.add("hidden");
    });
    document.getElementById(targetId).classList.remove("hidden");
  });
});

document.querySelectorAll(".select-timer").forEach((btn) => {
  btn.addEventListener("click", () => {
    const phase = btn.getAttribute("data-timer");
    setPhase(phase);
  });
});

document.getElementById("start").addEventListener("click", startTimer);
document.getElementById("pause").addEventListener("click", pauseTimer);
document.getElementById("reset").addEventListener("click", resetTimer);
document.getElementById("saveSettings").addEventListener("click", applySettings);
document.getElementById("loadSpotify").addEventListener("click", () => {
  const url = document.getElementById("spotifyInput").value;
  const embedUrl = url.replace("open.spotify.com/playlist", "open.spotify.com/embed/playlist");
  document.getElementById("spotifyContainer").innerHTML = `<iframe src="${embedUrl}" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
});

// Toggle settings view
gearIcons.forEach(icon => {
  icon.addEventListener('click', () => {
    const settings = icon.closest('.timer').querySelector('.settings-content');
    settings.classList.toggle('hidden');
  });
});

// Draggable blocks
blocks.forEach((block) => {
  const header = block.querySelector(".block-header");
  let isDragging = false;
  let offsetX, offsetY;

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - block.offsetLeft;
    offsetY = e.clientY - block.offsetTop;
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    block.style.left = `${e.clientX - offsetX}px`;
    block.style.top = `${e.clientY - offsetY}px`;
  });

  document.addEventListener("mouseup", () => {
    isDragging = false;
  });
});

updateDisplay();
