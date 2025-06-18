document.addEventListener("DOMContentLoaded", function () {
  const timerDisplay = document.getElementById("timerDisplay");
  const phaseLabel = document.getElementById("phaseLabel");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const resetBtn = document.getElementById("reset");
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
    if (justReset) return; // skip sound on reset
    const selectedSound = soundSelector.value;
    const audio = new Audio(selectedSound);
    audio.play();
  }

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
      }, 1000);
      isRunning = true;
    }
  });

  pauseBtn.addEventListener("click", () => {
    clearInterval(timer);
    isRunning = false;
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(timer);
    isRunning = false;
    justReset = true;
    switchPhase("work");
  });

  saveSettings.addEventListener("click", () => {
    document.body.style.backgroundImage = `url('${backgroundSelector.value}')`;
    switchPhase("work");
  });

  toggleSettings.addEventListener("click", () => {
    settingsContent.classList.toggle("hidden");
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      target.classList.toggle("hidden");
    });
  });

  timerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-timer");
      switchPhase(type);
    });
  });

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
    let offsetX, offsetY;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });

    function onMouseMove(e) {
      if (isDragging) {
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
        el.style.position = "absolute";
        el.style.zIndex = 1000;
      }
    }

    function onMouseUp() {
      isDragging = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
  }

  document.querySelectorAll(".block").forEach(makeDraggable);

  updateDisplay();
  switchPhase("work");
});
