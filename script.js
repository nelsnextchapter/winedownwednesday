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

  function switchPhase(newPhase) {
    phase = newPhase;
    phaseLabel.textContent =
      newPhase === "work" ? "Reading/Productivity" : "Break/Chat";
    const duration =
      newPhase === "work"
        ? parseInt(workInput.value)
        : parseInt(shortBreakInput.value);
    time = duration * 60;
    updateDisplay();
    playSound();
  }

  function playSound() {
    const selectedSound = soundSelector.value;
    const audio = new Audio(selectedSound);
    audio.play();
  }

  startBtn.addEventListener("click", () => {
    if (!isRunning) {
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          switchPhase(phase === "work" ? "break" : "work");
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

  saveSettings.addEventListener("click", () => {
    document.body.style.backgroundImage = `url('${backgroundSelector.value}')`;
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

  updateDisplay();
  switchPhase("work");
});
