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

  // Load from localStorage if available
const saved = localStorage.getItem("savedAffirmations");
if (saved) {
  affirmations = JSON.parse(saved);
  currentAffirmationIndex = 0;
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

  // ✨ Quotes Logic
const quoteText = document.getElementById("quoteText");
const quoteSpeaker = document.getElementById("quoteSpeaker");
const nextQuoteBtn = document.getElementById("nextQuote");
const shuffleQuotes = document.getElementById("shuffleQuotes");
const loopQuotes = document.getElementById("loopQuotes");
const quoteInput = document.getElementById("quoteInput");
const quoteFile = document.getElementById("quoteFile");
const loadQuotesBtn = document.getElementById("loadQuotes");
const clearQuotesBtn = document.getElementById("clearQuotes");
const categoryCheckboxes = document.getElementById("categoryCheckboxes");
const toggleQuoteSettings = document.getElementById("toggleQuoteSettings");
const quoteSettings = document.getElementById("quoteSettings");

  function parseQuotes(text) {
  const lines = text.split("\n");
  const quotes = [];

  let currentQuoteLines = [];

  for (const line of lines) {
    if (line.includes("~") && (line.match(/~/g) || []).length === 2) {
      // This is the speaker/category line
      const quoteText = currentQuoteLines.join("\n").trim();
      const [speaker, category] = line.split("~").map(part => part.trim());
      if (quoteText && speaker && category) {
        quotes.push({ text: quoteText, speaker, category });
      }
      currentQuoteLines = []; // Reset for next quote
    } else {
      currentQuoteLines.push(line);
    }
  }

  return quotes;
}

let quotes = [];
let filteredQuotes = [];
let currentQuoteIndex = 0;
let allCategories = new Set();

// Load from localStorage
const savedQuotes = JSON.parse(localStorage.getItem("savedQuotes") || "[]");
quotes = savedQuotes;
updateCategories();
resetFilteredQuotes();
displayQuote();

function updateCategories() {
  allCategories.clear();
  quotes.forEach(q => allCategories.add(q.category));
  categoryCheckboxes.innerHTML = "";

  [...allCategories].forEach(cat => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${cat}" checked> ${cat}`;
    categoryCheckboxes.appendChild(label);
  });

  categoryCheckboxes.querySelectorAll("input").forEach(checkbox => {
    checkbox.addEventListener("change", resetFilteredQuotes);
  });
}

function resetFilteredQuotes() {
  const selected = [...categoryCheckboxes.querySelectorAll("input:checked")].map(cb => cb.value);
  filteredQuotes = quotes.filter(q => selected.includes(q.category));
  currentQuoteIndex = 0;
  displayQuote();
}

function displayQuote() {
  if (filteredQuotes.length === 0) {
    quoteText.textContent = "No quotes loaded.";
    quoteSpeaker.textContent = "";
    return;
  }

  const quote = filteredQuotes[currentQuoteIndex];
  quoteText.textContent = quote.text;
  quoteSpeaker.textContent = `— ${quote.speaker}`;
}

nextQuoteBtn.addEventListener("click", () => {
  if (filteredQuotes.length === 0) return;

  if (shuffleQuotes.checked) {
    currentQuoteIndex = Math.floor(Math.random() * filteredQuotes.length);
  } else {
    currentQuoteIndex++;
    if (currentQuoteIndex >= filteredQuotes.length) {
      if (loopQuotes.checked) {
        currentQuoteIndex = 0;
      } else {
        currentQuoteIndex = filteredQuotes.length - 1;
      }
    }
  }
  displayQuote();
});

loadQuotesBtn.addEventListener("click", () => {
  quotes = parseQuotes(quoteInput.value);


  localStorage.setItem("savedQuotes", JSON.stringify(quotes));
  updateCategories();
  resetFilteredQuotes();
});

quoteFile.addEventListener("change", () => {
  const file = quoteFile.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    quotes = parseQuotes(e.target.result);


    localStorage.setItem("savedQuotes", JSON.stringify(quotes));
    updateCategories();
    resetFilteredQuotes();
  };
  reader.readAsText(file);
});

clearQuotesBtn.addEventListener("click", () => {
  localStorage.removeItem("savedQuotes");
  quotes = [];
  updateCategories();
  resetFilteredQuotes();
});

toggleQuoteSettings.addEventListener("click", () => {
  quoteSettings.classList.toggle("hidden");
});

  
});

