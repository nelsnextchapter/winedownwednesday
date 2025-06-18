document.addEventListener("DOMContentLoaded", function () {
  const timerDisplay = document.getElementById("timerDisplay");
  const phaseLabel = document.getElementById("phaseLabel");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const resetBtn = document.getElementById("reset");
  const readingBtn = document.getElementById("readingBtn");
  const breakBtn = document.getElementById("breakBtn");
  const sprintBtn = document.getElementById("sprintBtn");
  const workInput = document.getElementById("workDuration");
  const shortBreakInput = document.getElementById("shortBreakDuration");
  const longBreakInput = document.getElementById("longBreakDuration");
  const soundSelector = document.getElementById("soundSelector");
  const saveSettings = document.getElementById("saveSettings");
  const backgroundUrlInput = document.getElementById("backgroundUrl");
  const backgroundUpload = document.getElementById("backgroundUpload");
  const toggleSettings = document.querySelector(".toggle-settings");
  const settingsContent = document.querySelector(".settings-content");
  const navButtons = document.querySelectorAll(".nav-button");
  const blocks = document.querySelectorAll(".block");
  const spotifyInput = document.getElementById("spotifyInput");
  const loadSpotify = document.getElementById("loadSpotify");
  const spotifyContainer = document.getElementById("spotifyContainer");

  let timer;
  let time = 1500;
  let isRunning = false;
  let phase = "work";

  function updateDisplay() {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  function switchPhase(newPhase) {
    phase = newPhase;
    phaseLabel.textContent =
      newPhase === "work" ? "Reading/Productivity" : newPhase === "break" ? "Break/Chat" : "Short Sprint";
    const duration =
      newPhase === "work"
        ? parseInt(workInput.value)
        : newPhase === "break"
        ? parseInt(shortBreakInput.value)
        : parseInt(longBreakInput.value);
    time = duration * 60;
    updateDisplay();
    playSound();
  }

  function playSound() {
    const selectedSound = soundSelector.value;
    if (selectedSound) {
      const audio = new Audio(selectedSound);
      audio.play();
    }
  }

  startBtn.addEventListener("click", () => {
    if (!isRunning) {
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          switchPhase(phase === "work" ? "break" : phase === "break" ? "long" : "work");
          startBtn.click(); // auto-start next phase
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
    switchPhase("work");
  });

  readingBtn.addEventListener("click", () => switchPhase("work"));
  breakBtn.addEventListener("click", () => switchPhase("break"));
  sprintBtn.addEventListener("click", () => switchPhase("long"));

  saveSettings.addEventListener("click", () => {
    const backgroundUrl = backgroundUrlInput.value;
    if (backgroundUrl) {
      document.body.style.backgroundImage = `url('${backgroundUrl}')`;
    }
    const file = backgroundUpload.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        document.body.style.backgroundImage = `url('${e.target.result}')`;
      };
      reader.readAsDataURL(file);
    }
    switchPhase("work");
  });

  toggleSettings.addEventListener("click", () => {
    settingsContent.classList.toggle("hidden");
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      target.classList.toggle("hidden");
    });
  });

  function makeDraggable(el) {
    let isDragging = false;
    let offsetX, offsetY;

    el.addEventListener("mousedown", function (e) {
      if (e.target.closest(".settings-content") || e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") return;
      isDragging = true;
      offsetX = e.clientX - el.getBoundingClientRect().left;
      offsetY = e.clientY - el.getBoundingClientRect().top;
    });

    document.addEventListener("mousemove", function (e) {
      if (isDragging) {
        el.style.left = `${e.clientX - offsetX}px`;
        el.style.top = `${e.clientY - offsetY}px`;
      }
    });

    document.addEventListener("mouseup", function () {
      isDragging = false;
    });
  }

  blocks.forEach(makeDraggable);

  loadSpotify.addEventListener("click", () => {
    const url = spotifyInput.value;
    if (url) {
      spotifyContainer.innerHTML = `<iframe src="${url}" width="100%" height="80" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
    }
  });

  updateDisplay();
  switchPhase("work");
});
