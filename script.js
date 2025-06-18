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
  const modeButtons = document.querySelectorAll(".mode-btn");

  let timer;
  let time = 1500;
  let isRunning = false;
  let phase = "work";

  function updateDisplay() {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function playSound() {
    const selectedSound = soundSelector.value;
    if (selectedSound) {
      const audio = new Audio(selectedSound);
      audio.play();
    }
  }

  function switchPhase(newPhase) {
    phase = newPhase;
    phaseLabel.textContent =
      newPhase === "work" ? "Reading/Productivity" : "Break/Chat";

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

  startBtn.addEventListener("click", () => {
    if (!isRunning) {
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          switchPhase(phase === "work" ? "short" : "work");
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

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const mode = button.dataset.mode;
      switchPhase(mode);
    });
  });

  saveSettings.addEventListener("click", () => {
    const bgValue = backgroundSelector.value;
    if (bgValue.startsWith("http")) {
      document.body.style.backgroundImage = `url('${bgValue}')`;
    } else {
      const file = backgroundSelector.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
          document.body.style.backgroundImage = `url('${e.target.result}')`;
        };
        reader.readAsDataURL(file);
      }
    }
    switchPhase("work");
  });

  toggleSettings.addEventListener("click", () => {
    settingsContent.classList.toggle("hidden");
  });

  navButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      if (target) {
        document.querySelectorAll("main > .block").forEach((b) => b.classList.add("hidden"));
        target.classList.remove("hidden");
      }
    });
  });

  blocks.forEach((block) => {
    const header = block.querySelector(".block-header");
    let offsetX, offsetY;

    header.addEventListener("mousedown", (e) => {
      offsetX = e.clientX - block.getBoundingClientRect().left;
      offsetY = e.clientY - block.getBoundingClientRect().top;

      function onMouseMove(e) {
        block.style.left = e.clientX - offsetX + "px";
        block.style.top = e.clientY - offsetY + "px";
      }

      function onMouseUp() {
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
      }

      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
    });
  });

  updateDisplay();
  switchPhase("work");
});
