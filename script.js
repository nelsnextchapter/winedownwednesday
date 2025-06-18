// DOMContentLoaded event ensures script runs after page loads
document.addEventListener("DOMContentLoaded", function () {
const timerDisplay = document.getElementById("timerDisplay");
const phaseLabel = document.getElementById("phaseLabel");
@@ -14,70 +15,66 @@ document.addEventListener("DOMContentLoaded", function () {
const settingsContent = document.querySelector(".settings-content");
const navButtons = document.querySelectorAll(".nav-button");
const blocks = document.querySelectorAll(".block");
  const timerButtons = document.querySelectorAll(".set-timer button");
  const spotifyInput = document.getElementById("spotifyInput");
  const loadSpotify = document.getElementById("loadSpotify");
  const spotifyContainer = document.getElementById("spotifyContainer");
  const timerSelection = document.getElementById("timerSelection");
  const uploadBackgroundBtn = document.getElementById("uploadBackground");
  const backgroundInput = document.getElementById("backgroundInput");

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
    timerDisplay.textContent = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
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
    if (justReset) return; // skip sound on reset
const selectedSound = soundSelector.value;
    const audio = new Audio(selectedSound);
    audio.play();
    if (selectedSound) {
      const audio = new Audio(selectedSound);
      audio.play();
    }
}

  startBtn.addEventListener("click", () => {
  function startTimer() {
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
          if (phase === "work") {
            switchPhase("short");
            startTimer();
} else {
            // Do not auto start the next round
            // Stop after short break ends
            switchPhase("work");
}
}
}, 1000);
isRunning = true;
}
  });
  }

  startBtn.addEventListener("click", startTimer);

pauseBtn.addEventListener("click", () => {
clearInterval(timer);
@@ -87,12 +84,10 @@ document.addEventListener("DOMContentLoaded", function () {
resetBtn.addEventListener("click", () => {
clearInterval(timer);
isRunning = false;
    justReset = true;
    switchPhase("work");
    switchPhase(phase);
});

saveSettings.addEventListener("click", () => {
    document.body.style.backgroundImage = `url('${backgroundSelector.value}')`;
switchPhase("work");
});

@@ -102,57 +97,55 @@ document.addEventListener("DOMContentLoaded", function () {

navButtons.forEach((btn) => {
btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const target = document.getElementById(targetId);
      target.classList.toggle("hidden");
      const target = document.getElementById(btn.dataset.target);
      if (target.classList.contains("hidden")) {
        target.classList.remove("hidden");
        makeDraggable(target);
      } else {
        target.classList.add("hidden");
      }
});
});

  timerButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.getAttribute("data-timer");
      switchPhase(type);
    });
  timerSelection.addEventListener("click", (e) => {
    if (e.target.dataset.phase) {
      switchPhase(e.target.dataset.phase);
    }
});

  loadSpotify.addEventListener("click", () => {
    const url = spotifyInput.value.trim();
    if (url.includes("spotify")) {
      const embedUrl = url.replace("open.spotify.com", "open.spotify.com/embed");
      spotifyContainer.innerHTML = `<iframe src="${embedUrl}" width="100%" height="380" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>`;
  uploadBackgroundBtn.addEventListener("click", () => {
    const url = backgroundInput.value.trim();
    if (url) {
      document.body.style.backgroundImage = `url('${url}')`;
}
});

function makeDraggable(el) {
const header = el.querySelector(".block-header");
    let isDragging = false;
    let offsetX, offsetY;
    if (!header) return;

    header.addEventListener("mousedown", (e) => {
      isDragging = true;
    header.style.cursor = "move";
    let offsetX = 0, offsetY = 0, isDragging = false;

    header.onmousedown = function (e) {
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

  document.querySelectorAll(".block").forEach(makeDraggable);
  blocks.forEach(makeDraggable);

updateDisplay();
switchPhase("work");
