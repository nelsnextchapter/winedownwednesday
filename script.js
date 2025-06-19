document.addEventListener("DOMContentLoaded", function () {
  const timerDisplay = document.getElementById("timerDisplay");
  const phaseLabel = document.getElementById("phaseLabel");
  const startBtn = document.getElementById("start");
  const pauseBtn = document.getElementById("pause");
  const resetBtn = document.getElementById("reset");
  const workInput = document.getElementById("workDuration");
  const shortBreakInput = document.getElementById("shortBreakDuration");
  const longBreakInput = document.getElementById("longBreakDuration");
  const backgroundUpload = document.getElementById("backgroundUpload");
  const backgroundURL = document.getElementById("backgroundURL");
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
    const url = backgroundURL.value;
    if (url && url.startsWith("http")) {
      document.body.style.backgroundImage = `url('${url}')`;
    }


    // Background image via file upload
    const file = backgroundUpload.files[0];
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

   // Allow multiple blocks to open (fix) & make all blocks draggable
blocks.forEach((block) => {
  const header = block.querySelector(".block-header");
  if (header) {
    header.style.cursor = "move";
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

navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    target.classList.toggle("hidden");
  });
});



  // Timer mode switch buttons
  document.getElementById("selectWork").addEventListener("click", () => {
    setTimerPhase("work");
  });
  document.getElementById("selectShort").addEventListener("click", () => {
    setTimerPhase("short");
  });
  document.getElementById("selectLong").addEventListener("click", () => {
    setTimerPhase("long");
  });

  // Spotify playlist loader
  const spotifyInput = document.getElementById("spotifyInput");
  const loadSpotify = document.getElementById("loadSpotify");
  const spotifyContainer = document.getElementById("spotifyContainer");

  loadSpotify.addEventListener("click", () => {
    const url = spotifyInput.value.trim();
    if (url && url.includes("spotify.com")) {
      const embedUrl = url.replace("open.spotify.com", "open.spotify.com/embed");
      spotifyContainer.innerHTML = `
        <iframe src="${embedUrl}"
          width="100%" height="80" frameborder="0"
          allowtransparency="true" allow="encrypted-media"></iframe>`;
    }
  });

  setTimerPhase("work");

    // ✨ Affirmations logic
  const affirmationDisplay = document.getElementById("affirmationDisplay");
  const nextAffirmationBtn = document.getElementById("nextAffirmation");
  const shuffleCheckbox = document.getElementById("shuffleAffirmations");
  const loopCheckbox = document.getElementById("loopAffirmations");
  const affirmationInput = document.getElementById("affirmationInput");
  const affirmationFile = document.getElementById("affirmationFile");
  const loadAffirmationsBtn = document.getElementById("loadAffirmations");

  let affirmations = [];
  let currentAffirmationIndex = 0;

  const stored = localStorage.getItem("savedAffirmations");
if (stored) {
  affirmations = JSON.parse(stored);
  displayAffirmation();
}

  function displayAffirmation() {
    if (affirmations.length === 0) {
      affirmationDisplay.textContent = "No affirmations loaded.";
    } else {
      affirmationDisplay.textContent = affirmations[currentAffirmationIndex];
    }
  }

  nextAffirmationBtn.addEventListener("click", () => {
    if (affirmations.length === 0) return;

    if (shuffleCheckbox.checked) {
      currentAffirmationIndex = Math.floor(Math.random() * affirmations.length);
    } else {
      currentAffirmationIndex++;
      if (currentAffirmationIndex >= affirmations.length) {
        if (loopCheckbox.checked) {
          currentAffirmationIndex = 0;
        } else {
          currentAffirmationIndex = affirmations.length - 1;
        }
      }
    }
    displayAffirmation();
  });

  loadAffirmationsBtn.addEventListener("click", () => {
    const pasted = affirmationInput.value
      .split("\n")
      .map(line => line.trim())
      .filter(line => line);
    affirmations = [...pasted];
    localStorage.setItem("savedAffirmations", JSON.stringify(affirmations)); 
  displayAffirmation();
  });

  affirmationFile.addEventListener("change", () => {
    const file = affirmationFile.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (e) {
        const lines = e.target.result
          .split("\n")
          .map(line => line.trim())
          .filter(line => line);
        affirmations = [...lines];
        currentAffirmationIndex = 0;
        localStorage.setItem("savedAffirmations", JSON.stringify(affirmations)); // ← NEW LINE
      displayAffirmation();
      };
      reader.readAsText(file);
    }
  });

  document.getElementById("clearAffirmations").addEventListener("click", () => {
  localStorage.removeItem("savedAffirmations");
  affirmations = [];
  currentAffirmationIndex = 0;
  displayAffirmation();
});

  const toggleAffirmationSettings = document.getElementById("toggleAffirmationSettings");
  const affirmationSettings = document.getElementById("affirmationSettings");

  toggleAffirmationSettings.addEventListener("click", () => {
    affirmationSettings.classList.toggle("hidden");
     console.log("Toggled affirmation settings");
  });

  
});

