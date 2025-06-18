window.onload = () => {
  let timer;
  let timeLeft;
  let currentPhase = "work";
  let settings = {
    work: 25,
    shortBreak: 5,
    longBreak: 15,
  };
  let selectedSound = "whoosh";
  const sounds = {
    whoosh: new Audio("sounds/whoosh.mp3"),
    chime: new Audio("sounds/chime.mp3"),
  };

document.addEventListener("DOMContentLoaded", function () {
const timerDisplay = document.getElementById("timerDisplay");
  const phaseLabel = document.getElementById("phaseLabel");
const startBtn = document.getElementById("start");
const pauseBtn = document.getElementById("pause");
const resetBtn = document.getElementById("reset");
  const phaseLabel = document.getElementById("phaseLabel");
  const settingsButton = document.querySelector(".toggle-settings");
  const settingsContent = document.querySelector(".settings-content");
  const workInput = document.getElementById("workDuration");
  const shortBreakInput = document.getElementById("shortBreakDuration");
  const longBreakInput = document.getElementById("longBreakDuration");
const backgroundSelector = document.getElementById("backgroundSelector");
  const soundSelector = document.getElementById("soundSelector");
  const saveSettings = document.getElementById("saveSettings");
  const toggleSettings = document.querySelector(".toggle-settings");
  const settingsContent = document.querySelector(".settings-content");
  const navButtons = document.querySelectorAll(".nav-button");
  const blocks = document.querySelectorAll(".block");
  const timerButtons = document.querySelectorAll(".set-timer button");
  const spotifyInput = document.getElementById("spotifyInput");
  const loadSpotify = document.getElementById("loadSpotify");
  const spotifyContainer = document.getElementById("spotifyContainer");

  function updateTimerDisplay() {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, "0");
    const seconds = (timeLeft % 60).toString().padStart(2, "0");
    timerDisplay.textContent = `${minutes}:${seconds}`;
  let timer;
  let time = 1500;
  let isRunning = false;
  let phase = "work";
  let autoStartShortBreak = true;
  let justReset = false;

  function updateDisplay() {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function switchPhase(newPhase) {
    phase = newPhase;
    if (phase === "work") {
      phaseLabel.textContent = "Reading/Productivity";
      time = parseInt(workInput.value) * 60;
    } else if (phase === "shortBreak") {
      phaseLabel.textContent = "Break/Chat";
      time = parseInt(shortBreakInput.value) * 60;
    } else if (phase === "longBreak") {
      phaseLabel.textContent = "Short Sprint";
      time = parseInt(longBreakInput.value) * 60;
    }
    updateDisplay();
}

function playSound() {
    const sound = sounds[selectedSound].cloneNode(true);
    sound.play().catch((e) => {
      console.warn("Sound playback blocked or failed", e);
    });
    if (justReset) return; // skip sound on reset
    const selectedSound = soundSelector.value;
    const audio = new Audio(selectedSound);
    audio.play();
}

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      if (timeLeft > 0) {
        timeLeft--;
        updateTimerDisplay();
      } else {
        clearInterval(timer);
        playSound();
        if (currentPhase === "work") {
          switchPhase("shortBreak", true);
  startBtn.addEventListener("click", () => {
    if (!isRunning) {
      justReset = false;
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          playSound();

          if (phase === "work" && autoStartShortBreak) {
            switchPhase("shortBreak");
            startBtn.click();
          } else {
            // Do not auto start the next round
          }
}
      }
    }, 1000);
  }
      }, 1000);
      isRunning = true;
    }
  });

  function pauseTimer() {
  pauseBtn.addEventListener("click", () => {
clearInterval(timer);
  }
    isRunning = false;
  });

  function resetTimer() {
  resetBtn.addEventListener("click", () => {
clearInterval(timer);
    timeLeft = settings[currentPhase] * 60;
    updateTimerDisplay();
    // Do NOT play sound here
  }

  function switchPhase(phase, autoStart = false) {
    currentPhase = phase;
    phaseLabel.textContent =
      phase === "work"
        ? "Reading/Productivity"
        : phase === "shortBreak"
        ? "Break/Chat"
        : "Short Sprint";

    timeLeft = settings[phase] * 60;
    updateTimerDisplay();
    if (autoStart) startTimer();
  }
    isRunning = false;
    justReset = true;
    switchPhase("work");
  });

  startBtn.addEventListener("click", startTimer);
  pauseBtn.addEventListener("click", pauseTimer);
  resetBtn.addEventListener("click", resetTimer);
  saveSettings.addEventListener("click", () => {
    document.body.style.backgroundImage = `url('${backgroundSelector.value}')`;
    switchPhase("work");
  });

  settingsButton.addEventListener("click", () => {
  toggleSettings.addEventListener("click", () => {
settingsContent.classList.toggle("hidden");
});

  document.querySelectorAll(".set-timer button").forEach((btn) => {
  navButtons.forEach((btn) => {
btn.addEventListener("click", () => {
      switchPhase(btn.dataset.timer);
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      target.classList.toggle("hidden");
});
});

  document.getElementById("saveSettings").addEventListener("click", () => {
    settings.work = parseInt(document.getElementById("workDuration").value) || 25;
    settings.shortBreak = parseInt(document.getElementById("shortBreakDuration").value) || 5;
    settings.longBreak = parseInt(document.getElementById("longBreakDuration").value) || 15;
    selectedSound = document.getElementById("soundSelector").value;
    document.body.style.backgroundImage = `url('images/${backgroundSelector.value}')`;
    switchPhase(currentPhase);
  });

  // Spotify
  const spotifyInput = document.getElementById("spotifyInput");
  const spotifyContainer = document.getElementById("spotifyContainer");
  document.getElementById("loadSpotify").addEventListener("click", () => {
    const url = spotifyInput.value;
    const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
    if (match && match[1]) {
      const playlistId = match[1];
      spotifyContainer.innerHTML = `<iframe src="https://open.spotify.com/embed/playlist/${playlistId}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    }
  });

  // Tabs – allow multiple open
  const navButtons = document.querySelectorAll(".nav-button");
  navButtons.forEach((btn) => {
  timerButtons.forEach((btn) => {
btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      target.classList.toggle("hidden");
      const type = btn.getAttribute("data-timer");
      switchPhase(type);
});
});

  // Make all boxes draggable using .block-header
  const blocks = document.querySelectorAll(".block");
  blocks.forEach((block) => {
    const header = block.querySelector(".block-header");
    if (!header) return;
  loadSpotify.addEventListener("click", () => {
    const url = spotifyInput.value.trim();
    if (url.includes("spotify")) {
      const embedUrl = url.replace("open.spotify.com", "open.spotify.com/embed");
      spotifyContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    }
  });

  function makeDraggable(el) {
    const header = el.querySelector(".block-header");
let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;
    let offsetX, offsetY;

    header.style.cursor = "move";
header.addEventListener("mousedown", (e) => {
isDragging = true;
      offsetX = e.clientX - block.offsetLeft;
      offsetY = e.clientY - block.offsetTop;
      block.style.position = "absolute";
      block.style.zIndex = 999;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
});

    document.addEventListener("mousemove", (e) => {
      if (!isDragging) return;
      block.style.left = `${e.clientX - offsetX}px`;
      block.style.top = `${e.clientY - offsetY}px`;
    });
    function onMouseMove(e) {
      if (isDragging) {
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.position = "absolute";
        el.style.zIndex = 1000;
      }
    }

    document.addEventListener("mouseup", () => {
    function onMouseUp() {
isDragging = false;
    });
  });
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  document.querySelectorAll(".block").forEach(makeDraggable);

  // Init
  updateDisplay();
switchPhase("work");
};
});
