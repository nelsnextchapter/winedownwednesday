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
  const fileUpload = document.getElementById("fileUpload");
  const soundSelector = document.getElementById("soundSelector");
  const saveSettings = document.getElementById("saveSettings");
  const settingsContent = document.querySelector(".settings-content");
  const toggleSettings = document.querySelector(".toggle-settings");
  const navButtons = document.querySelectorAll(".nav-button");
  const blocks = document.querySelectorAll(".block");
  const timerButtons = document.querySelectorAll(".timer-type");

  let timer;
  let time = 1500;
  let isRunning = false;
  let currentPhase = "work";
  let skipNextAutoStart = false;

  function updateDisplay() {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds
      .toString()
      .padStart(2, "0")}`;
  }

  function setTimerPhase(phase) {
    currentPhase = phase;
    let duration = 1500;
    if (phase === "work") {
      phaseLabel.textContent = "Reading/Productivity";
      duration = parseInt(workInput.value) * 60;
    } else if (phase === "short") {
      phaseLabel.textContent = "Break/Chat";
      duration = parseInt(shortBreakInput.value) * 60;
    } else if (phase === "long") {
      phaseLabel.textContent = "Short Sprint";
      duration = parseInt(longBreakInput.value) * 60;
    }
    time = duration;
    updateDisplay();
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
          playSound();

          if (currentPhase === "work") {
            setTimerPhase("short");
            startBtn.click(); // Auto start short break
          } else if (currentPhase === "short") {
            if (!skipNextAutoStart) {
              skipNextAutoStart = true;
              // do not auto-start work phase
            } else {
              skipNextAutoStart = false;
              setTimerPhase("work");
            }
          } else if (currentPhase === "long") {
            setTimerPhase("work");
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
    setTimerPhase(currentPhase); // no sound on reset
  });

  saveSettings.addEventListener("click", () => {
    // Background image via URL
    const imageUrl = backgroundSelector.value;
    if (imageUrl && imageUrl.startsWith("http")) {
      document.body.style.backgroundImage = `url('${imageUrl}')`;
    }

    // Background image via file upload
    const file = fileUpload.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = function () {
        document.body.style.backgroundImage = `url('${reader.result}')`;
      };
      reader.readAsDataURL(file);
    }
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

  // Allow multiple blocks to open (fix)
  blocks.forEach((block) => {
    const header = block.querySelector(".block-header");
    if (header) {
      header.addEventListener("mousedown", function (e) {
        let offsetX = e.clientX - block.getBoundingClientRect().left;
        let offsetY = e.clientY - block.getBoundingClientRect().top;

        function moveAt(mouseEvent) {
          block.style.left = mouseEvent.clientX - offsetX + "px";
          block.style.top = mouseEvent.clientY - offsetY + "px";
        }

        function stopDrag() {
          document.removeEventListener("mousemove", moveAt);
          document.removeEventListener("mouseup", stopDrag);
        }

        document.addEventListener("mousemove", moveAt);
        document.addEventListener("mouseup", stopDrag);
      });
    }
  });

  // Timer switch buttons
  timerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.type;
      setTimerPhase(type);
    });
  });

  setTimerPhase("work");
});
