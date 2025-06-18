// DOMContentLoaded event ensures script runs after page loads
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
  const timerSelection = document.getElementById("timerSelection");
  const uploadBackgroundBtn = document.getElementById("uploadBackground");
  const backgroundInput = document.getElementById("backgroundInput");

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
      newPhase === "work" ? "Reading/Productivity" : newPhase === "short" ? "Break/Chat" : "Short Sprint";
    const duration =
      newPhase === "work"
        ? parseInt(workInput.value)
        : newPhase === "short"
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

  function startTimer() {
    if (!isRunning) {
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          if (phase === "work") {
            switchPhase("short");
            startTimer();
          } else {
            // Stop after short break ends
            switchPhase("work");
          }
        }
      }, 1000);
      isRunning = true;
    }
  }

  startBtn.addEventListener("click", startTimer);

  pauseBtn.addEventListener("click", () => {
    clearInterval(timer);
    isRunning = false;
  });

  resetBtn.addEventListener("click", () => {
    clearInterval(timer);
    isRunning = false;
    switchPhase(phase);
  });

  saveSettings.addEventListener("click", () => {
    switchPhase("work");
  });

  toggleSettings.addEventListener("click", () => {
    settingsContent.classList.toggle("hidden");
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (target.classList.contains("hidden")) {
        target.classList.remove("hidden");
        makeDraggable(target);
      } else {
        target.classList.add("hidden");
      }
    });
  });

  timerSelection.addEventListener("click", (e) => {
    if (e.target.dataset.phase) {
      switchPhase(e.target.dataset.phase);
    }
  });

  uploadBackgroundBtn.addEventListener("click", () => {
    const url = backgroundInput.value.trim();
    if (url) {
      document.body.style.backgroundImage = `url('${url}')`;
    }
  });

  function makeDraggable(el) {
    const header = el.querySelector(".block-header");
    if (!header) return;

    header.style.cursor = "move";
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.onmousedown = function (e) {
      offsetX = e.clientX - el.offsetLeft;
      offsetY = e.clientY - el.offsetTop;
      isDragging = true;
      document.onmousemove = function (e) {
        if (isDragging) {
          el.style.left = `${e.clientX - offsetX}px`;
          el.style.top = `${e.clientY - offsetY}px`;
        }
      };
      document.onmouseup = function () {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;
      };
    };
  }

  blocks.forEach(makeDraggable);

  updateDisplay();
  switchPhase("work");
});
