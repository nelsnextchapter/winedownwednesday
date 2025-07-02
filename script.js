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
  const savedFile = localStorage.getItem("backgroundImageFile");
  const savedUrl = localStorage.getItem("backgroundImageURL");
  const fileUpload = document.getElementById("fileUpload");
  const saveSettings = document.getElementById("saveSettings");
  const settingsContent = document.querySelector(".settings-content");
  const toggleSettings = document.querySelector(".toggle-settings");
  const navButtons = document.querySelectorAll(".nav-button");
  const blocks = document.querySelectorAll(".block");
  const timerButtons = document.querySelectorAll(".timer-type");
  const timerSoundUrlInput = document.getElementById("timerSoundUrl");
  const timerSoundFile = document.getElementById("timerSoundFile");
  const clearTimerSoundBtn = document.getElementById("clearTimerSound");
  
  // 🌅 Load saved background image
  if (savedFile) {
  document.body.style.backgroundImage = `url('${savedFile}')`;
} else if (savedUrl) {
  document.body.style.backgroundImage = `url('${savedUrl}')`;
  backgroundURL.value = savedUrl;
}

  // Load saved timer sound URL from localStorage
  let timerSoundUrl = localStorage.getItem("timerEndSound") || "";
  console.log("⏳ Loaded timer sound on startup:", timerSoundUrl);

  let audioPlayer = null;

if (timerSoundUrl) {
  timerSoundUrlInput.value = timerSoundUrl;
}


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

  const backgroundType = localStorage.getItem("backgroundType");
const backgroundData = localStorage.getItem("backgroundData");

if (backgroundData) {
  if (backgroundType === "image") {
    document.body.style.backgroundImage = `url('${backgroundData}')`;
  } else if (backgroundType === "video") {
    const video = document.getElementById("backgroundVideo");
    if (video) {
      video.src = backgroundData;
      video.style.display = "block";
      document.body.style.backgroundImage = ""; // Clear any image background
    }
  }
}

  // When user types/pastes a URL and changes input
  timerSoundUrlInput.addEventListener("change", () => {
    const pastedUrl = timerSoundUrlInput.value.trim();
    if (pastedUrl) {
      timerSoundUrl = pastedUrl;
      localStorage.setItem("timerEndSound", pastedUrl);
      console.log("Timer sound set via URL:", pastedUrl);
    }
  });

  // When user uploads a sound file
  timerSoundFile.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      const dataUrl = event.target.result;
      localStorage.setItem("timerEndSound", dataUrl);
      timerSoundUrlInput.value = dataUrl;
      timerSoundUrl = dataUrl; // 🟢 make sure this assignment happens AFTER localStorage is updated
      console.log("Timer sound set via file upload:", timerSoundUrl);

    };
    reader.readAsDataURL(file);
  });

  // Clear timer sound settings
  clearTimerSoundBtn.addEventListener("click", () => {
    localStorage.removeItem("timerEndSound");
    timerSoundUrl = "";
    timerSoundUrlInput.value = "";
    timerSoundFile.value = "";
    console.log("Timer sound cleared.");
  });

  // Function to play the timer end sound
  function playSound() {
    if (!timerSoundUrl) {
      console.log("No timer sound set.");
      return;
    }
    console.log("🔊 Trying to play sound:", timerSoundUrl);
    const audio = new Audio(timerSoundUrl);
    audio.play().then(() => {
      console.log("✅ Sound playback started");
    }).catch(e => {
      console.error("❌ Audio play failed:", e);
    });
  }

    setTimerPhase("work");


  startBtn.addEventListener("click", () => {
    if (!isRunning) {
       // 🆕 UNLOCK AUDIO
    if (timerSoundUrl) {
      if (!audioPlayer) {
        audioPlayer = new Audio(timerSoundUrl);
        audioPlayer.volume = 0;
        audioPlayer.play().then(() => {
          audioPlayer.pause();
          audioPlayer.currentTime = 0;
          audioPlayer.volume = 1;
          console.log("🔓 Audio unlocked");
        }).catch(err => {
          console.warn("Audio unlock failed:", err);
        });
      }
    }

    // ⏳ START TIMER
      timer = setInterval(() => {
        time--;
        updateDisplay();
        if (time <= 0) {
          clearInterval(timer);
          isRunning = false;
          console.log("Timer ended, attempting to play sound.");
           // ✅ REUSE UNLOCKED AUDIO OBJECT
        if (audioPlayer) {
          audioPlayer.currentTime = 0;
          audioPlayer.play().then(() => {
            console.log("✅ Timer sound played");
          }).catch(e => {
            console.warn("❌ Timer sound failed to play:", e);
          });
        } else {
          console.warn("⚠️ No audioPlayer loaded");
        }

        // ⏭ PHASE SWITCHING
        if (currentPhase === "work") {
          setTimerPhase("short");
          startBtn.click(); // Auto start short break
        } else if (currentPhase === "short") {
          if (!skipNextAutoStart) {
            skipNextAutoStart = true;
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
  // Save pasted/typed sound URL
  const pastedSound = timerSoundUrlInput.value.trim();
  if (pastedSound && pastedSound.startsWith("http")) {
    timerSoundUrl = pastedSound;
    localStorage.setItem("timerEndSound", pastedSound);
    console.log("Timer sound set via URL:", pastedSound);
  }

  // Save background via URL (only for images)
  const url = backgroundURL.value.trim();
  if (url && url.startsWith("http")) {
    document.body.style.backgroundImage = `url('${url}')`;
    localStorage.setItem("backgroundType", "image");
    localStorage.setItem("backgroundData", url);
    localStorage.removeItem("backgroundImageFile");
  }

  // Save background via file upload (image or video)
  const file = backgroundUpload.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onloadend = function () {
      const result = reader.result;
      const isVideo = file.type.startsWith("video/");
      const isImage = file.type.startsWith("image/");

      if (isImage) {
        document.body.style.backgroundImage = `url('${result}')`;
        const video = document.getElementById("backgroundVideo");
        if (video) video.style.display = "none"; // Hide video if showing image
        localStorage.setItem("backgroundType", "image");
        localStorage.setItem("backgroundData", result);
      } else if (isVideo) {
        const video = document.getElementById("backgroundVideo");
        if (video) {
          video.src = result;
          video.style.display = "block";
        }
        document.body.style.backgroundImage = ""; // Clear image background
        localStorage.setItem("backgroundType", "video");
        localStorage.setItem("backgroundData", result);
      }
    };
    reader.readAsDataURL(file);
    }
  });

  toggleSettings.addEventListener("click", () => {
    timerSettingsPanel.classList.toggle("hidden");
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

document.querySelectorAll(".nav-button").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.target;
    const target = document.getElementById(targetId);
    if (!target) return;

    // Toggle the clicked panel only
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
const toggleSpotifySettings = document.querySelector(".toggle-spotify-settings");
const spotifySettingsContent = document.querySelector(".spotify-settings-content");

// Toggle Spotify settings visibility
toggleSpotifySettings.addEventListener("click", () => {
  spotifySettingsContent.classList.toggle("hidden");
});

// Load Spotify player on click and save to localStorage
loadSpotify.addEventListener("click", () => {
  const url = spotifyInput.value.trim();
  if (url && url.includes("spotify.com")) {
    const embedUrl = url.replace("open.spotify.com", "open.spotify.com/embed");
    spotifyContainer.innerHTML = `
      <iframe src="${embedUrl}"
        width="100%" height="80" frameborder="0"
        allowtransparency="true" allow="encrypted-media"></iframe>`;
    localStorage.setItem("spotifyEmbedUrl", embedUrl);
  }
});

// Load saved Spotify player on page load
const savedSpotify = localStorage.getItem("spotifyEmbedUrl");
if (savedSpotify) {
  spotifyContainer.innerHTML = `
    <iframe src="${savedSpotify}"
      width="100%" height="80" frameborder="0"
      allowtransparency="true" allow="encrypted-media"></iframe>`;
}
  


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

// ✨ Spinner Wheel Logic
const canvas = document.getElementById("spinnerCanvas");
const ctx = canvas.getContext("2d");
const spinBtn = document.getElementById("spinButton");
const spinnerInput = document.getElementById("spinnerInput");
const spinnerFile = document.getElementById("spinnerFile");
const loadSpinnerItems = document.getElementById("loadSpinnerItems");
const clearSpinnerItems = document.getElementById("clearSpinnerItems");
const spinnerSettings = document.getElementById("spinnerSettings");
const toggleSpinnerSettings = document.getElementById("toggleSpinnerSettings");
const spinnerCategoryCheckboxes = document.getElementById("spinnerCategoryCheckboxes");
const manualSelectContainer = document.getElementById("manualSelectContainer");
const displayResult = document.getElementById("spinnerResult");
const resultSoundInput = document.getElementById("resultSoundUrl");
const clickSoundInput = document.getElementById("clickSoundUrl");
const spinSoundInput = document.getElementById("spinSoundUrl");
const clickVolume = document.getElementById("clickVolume");
const spinVolume = document.getElementById("spinVolume");
const resultVolume = document.getElementById("resultVolume");

let clickSoundUrlObject = null;
let spinSoundUrlObject = null;
let resultSoundUrlObject = null;

// On page load - load saved data URLs into inputs if present
window.addEventListener("load", () => {
  const savedClickSound = localStorage.getItem("clickSoundData");
  if (savedClickSound) clickSoundInput.value = savedClickSound;

  const savedSpinSound = localStorage.getItem("spinSoundData");
  if (savedSpinSound) spinSoundInput.value = savedSpinSound;

  const savedResultSound = localStorage.getItem("resultSoundData");
  if (savedResultSound) resultSoundInput.value = savedResultSound;
});

// New event listeners to read files as Base64 and save to localStorage
document.getElementById("clickSoundFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const dataUrl = event.target.result;
      localStorage.setItem("clickSoundData", dataUrl);
      clickSoundInput.value = dataUrl;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById("spinSoundFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const dataUrl = event.target.result;
      localStorage.setItem("spinSoundData", dataUrl);
      spinSoundInput.value = dataUrl;
    };
    reader.readAsDataURL(file);
  }
});

document.getElementById("resultSoundFile").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(event) {
      const dataUrl = event.target.result;
      localStorage.setItem("resultSoundData", dataUrl);
      resultSoundInput.value = dataUrl;
    };
    reader.readAsDataURL(file);
  }
});

  
let items = [];
let selectedItems = [];
let categories = new Set();
let spinning = false;
let angle = 0;
let spinTimeout;

function drawWheel() {
  const numItems = selectedItems.length;
  if (numItems === 0) return;
  const angleStep = (2 * Math.PI) / numItems;
  const radius = canvas.width / 2;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  function getColorForIndex(index, total) {
  const baseHue = 34;           // HSL for ##FFA552
  const baseSaturation = 100;    // %
  const baseLightness = 67;     // %

  // Adjust lightness slightly for variation
  const lightnessVariation = 10;
  const step = lightnessVariation / total;
  const lightness = baseLightness - (lightnessVariation / 2) + (index * step);

  return `hsl(${baseHue}, ${baseSaturation}%, ${lightness}%)`;
}

  selectedItems.forEach((item, i) => {
    const startAngle = i * angleStep + angle;
    const endAngle = startAngle + angleStep;
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, startAngle, endAngle);
    ctx.fillStyle = item.color || getColorForIndex(i, numItems);
    ctx.fill();
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(startAngle + angleStep / 2);
    ctx.textAlign = "right";
    ctx.fillStyle = "#333";
    ctx.font = "16px DM Sans";
    ctx.fillText(item.text, radius - 10, 5);
    ctx.restore();
  });

  // Draw center pointer
  ctx.beginPath();
  ctx.moveTo(radius - 10, 10);
  ctx.lineTo(radius + 10, 10);
  ctx.lineTo(radius, 0);
  ctx.closePath();
  ctx.fillStyle = "#CDA67F";
  ctx.fill();
}

function playSound(url, volume = 0.5) {
  if (!url) return;
  const audio = new Audio(url);
  audio.volume = volume;
  audio.play().catch(err => console.error("Failed to play sound:", err));
}

function spinWheel() {
  if (spinning || selectedItems.length === 0) return;

  playSound(clickSoundInput.value, parseFloat(clickVolume.value));
  spinning = true;

  const spinAudio = new Audio(spinSoundInput.value);
  spinAudio.volume = parseFloat(spinVolume.value);

  const doSpin = (duration) => {
    const spinAngle = (Math.random() * 360 + 720) * 2; // 2x faster spin
    let start = null;

    spinAudio.play();

    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const easeOut = 1 - Math.pow(1 - progress / duration, 3);
      angle = (easeOut * spinAngle * Math.PI) / 180;
      drawWheel();

      if (progress < duration) {
        spinTimeout = requestAnimationFrame(animate);
      } else {
        spinning = false;
        cancelAnimationFrame(spinTimeout);

        const degrees = ((angle * 180) / Math.PI) % 360;
        const adjustedDegrees = (degrees + 90) % 360; // align with top (12 o’clock)
        const index = Math.floor((selectedItems.length - (adjustedDegrees / 360) * selectedItems.length)) % selectedItems.length;
        const selected = selectedItems[index];

        setTimeout(() => {
          playSound(resultSoundInput.value, parseFloat(resultVolume.value));
          showConfetti();
          displayResult.textContent = selected.text;
        }, 300);
      }
    }

    animate(performance.now());
  };

  spinAudio.addEventListener("loadedmetadata", () => {
    const duration = spinAudio.duration * 1000 || 4000;
    doSpin(duration);
  });

  spinAudio.addEventListener("error", () => {
    console.warn("Could not load spin sound. Falling back to default duration.");
    doSpin(4000);
  });
}


function showConfetti() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 }
  });
}

function loadFromLocalStorage() {
  const saved = localStorage.getItem("spinnerItems");
  if (!saved) return;
  items = JSON.parse(saved);
  updateCategoryUI();
  updateManualSelect();
  drawWheel();
}

function saveToLocalStorage() {
  localStorage.setItem("spinnerItems", JSON.stringify(items));
}

function updateCategoryUI() {
  categories = new Set(items.map(i => i.category));
  spinnerCategoryCheckboxes.innerHTML = "";
  [...categories].forEach(cat => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${cat}" checked> ${cat}`;
    spinnerCategoryCheckboxes.appendChild(label);
  });
  spinnerCategoryCheckboxes.querySelectorAll("input").forEach(cb => cb.addEventListener("change", updateManualSelect));
}

function updateManualSelect() {
  const selectedCategories = [...spinnerCategoryCheckboxes.querySelectorAll("input:checked")].map(cb => cb.value);
  const filtered = items.filter(i => selectedCategories.includes(i.category));
  manualSelectContainer.innerHTML = "";
  filtered.sort((a, b) => a.text.localeCompare(b.text));
  filtered.forEach(item => {
    const label = document.createElement("label");
    const checked = selectedItems.some(si => si.text === item.text);
    label.innerHTML = `<input type="checkbox" value="${item.text}" ${checked ? "checked" : ""}> ${item.text}`;
    manualSelectContainer.appendChild(label);
  });
  manualSelectContainer.querySelectorAll("input").forEach(cb => cb.addEventListener("change", () => {
    const selected = [...manualSelectContainer.querySelectorAll("input:checked")].map(i => i.value);
    selectedItems = items.filter(i => selected.includes(i.text));
    drawWheel();
  }));
}

function parseItems(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l.includes("~"))
    .map(l => {
      const [text, category] = l.split("~").map(s => s.trim());
      return { text, category };
    });
}

loadSpinnerItems.addEventListener("click", () => {
  const lines = spinnerInput.value.split("\n");
  const parsed = parseItems(lines);
  items.push(...parsed);
  saveToLocalStorage();
  updateCategoryUI();
  updateManualSelect();
});

  const removeSpinnerItemsBtn = document.getElementById("removeSpinnerItems");

removeSpinnerItemsBtn.addEventListener("click", () => {
  // Get checked item texts from manual select checkboxes
  const checkedTexts = [...manualSelectContainer.querySelectorAll("input:checked")].map(cb => cb.value);

  // Filter out items that are checked to be removed
  items = items.filter(item => !checkedTexts.includes(item.text));

  // Save updated list
  saveToLocalStorage();

  // Update UI and redraw
  updateCategoryUI();
  updateManualSelect();
  drawWheel();
});

spinnerFile.addEventListener("change", () => {
  const file = spinnerFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n");
    const parsed = parseItems(lines);
    items.push(...parsed);
    saveToLocalStorage();
    updateCategoryUI();
    updateManualSelect();
  };
  reader.readAsText(file);
});

clearSpinnerItems.addEventListener("click", () => {
  items = [];
  selectedItems = [];
  saveToLocalStorage();
  updateCategoryUI();
  updateManualSelect();
  drawWheel();
});

  const randomizeCheckbox = document.getElementById("randomizeSpinner");

randomizeCheckbox.addEventListener("change", () => {
  if (!randomizeCheckbox.checked) return;

  const selectedCats = [...spinnerCategoryCheckboxes.querySelectorAll("input:checked")].map(cb => cb.value);
  const filtered = items.filter(i => selectedCats.includes(i.category));
  shuffleArray(filtered); // optional
  selectedItems = filtered.slice(0, 10); // limit to 10 max
  drawWheel();
});

// Optional helper:
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}


spinBtn.addEventListener("click", spinWheel);
toggleSpinnerSettings.addEventListener("click", () => {
  spinnerSettings.classList.toggle("hidden");
});

// Initial Load
loadFromLocalStorage();
updateManualSelect();
drawWheel();

  // ✅ TO-DO CHECKLIST LOGIC
const todoBlock = document.getElementById("todoBlock");
const todoInput = document.getElementById("todoInput");
const todoFile = document.getElementById("todoFile");
const loadTodoTasks = document.getElementById("loadTodoTasks");
const clearTodoList = document.getElementById("clearTodoList");
const removeSelectedTodos = document.getElementById("removeSelectedTodos");
const todoListContainer = document.getElementById("todoListContainer");
const todoCategoryFilters = document.getElementById("todoCategoryFilters");

let todoTasks = [];
let filteredTodos = [];

function parseTodoLines(lines) {
  return lines
    .map(l => l.trim())
    .filter(l => l.includes("~"))
    .map(l => {
      const [text, category] = l.split("~").map(s => s.trim());
      return { text, category, completed: false };
    });
}

function saveTodos() {
  localStorage.setItem("todoTasks", JSON.stringify(todoTasks));
}

function loadTodos() {
  const saved = localStorage.getItem("todoTasks");
  if (saved) {
    todoTasks = JSON.parse(saved);
    updateTodoFilters();
    renderTodoList();
  }
}

function updateTodoFilters() {
  const categories = [...new Set(todoTasks.map(t => t.category))];
  todoCategoryFilters.innerHTML = "";
  categories.forEach(cat => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${cat}" checked> ${cat}`;
    todoCategoryFilters.appendChild(label);
  });

  todoCategoryFilters.querySelectorAll("input").forEach(cb => {
    cb.addEventListener("change", renderTodoList);
  });
}

function renderTodoList() {
  const selectedCats = [...todoCategoryFilters.querySelectorAll("input:checked")].map(cb => cb.value);
  filteredTodos = todoTasks.filter(t => selectedCats.includes(t.category));
  todoListContainer.innerHTML = "";

  filteredTodos.forEach((task, index) => {
    const div = document.createElement("div");
    div.className = "todo-item" + (task.completed ? " completed" : "");
    div.setAttribute("draggable", true);
    div.dataset.index = index;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.completed;
    checkbox.addEventListener("change", () => {
      task.completed = checkbox.checked;
      saveTodos();
      renderTodoList();
    });

    const text = document.createElement("div");
    text.className = "todo-task-text";
    text.textContent = task.text;

    const category = document.createElement("div");
    category.className = "todo-task-category" + (task.category.length < 12 ? " bold" : "");
    category.textContent = task.category;

    div.appendChild(checkbox);
    div.appendChild(text);
    div.appendChild(category);
    todoListContainer.appendChild(div);
  });

  enableDragAndDrop();
}

function enableDragAndDrop() {
  let dragged;

  todoListContainer.querySelectorAll(".todo-item").forEach(item => {
    item.addEventListener("dragstart", () => dragged = item);
    item.addEventListener("dragover", e => e.preventDefault());
    item.addEventListener("drop", e => {
      e.preventDefault();
      if (!dragged) return;
      const from = parseInt(dragged.dataset.index);
      const to = parseInt(item.dataset.index);
      const [moved] = todoTasks.splice(from, 1);
      todoTasks.splice(to, 0, moved);
      saveTodos();
      renderTodoList();
    });
  });
}

// Handle pasted text or file upload
loadTodoTasks.addEventListener("click", () => {
  const lines = todoInput.value.split("\n");
  const parsed = parseTodoLines(lines);
  todoTasks.push(...parsed);
  saveTodos();
  updateTodoFilters();
  renderTodoList();
});

todoFile.addEventListener("change", () => {
  const file = todoFile.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    const lines = e.target.result.split("\n");
    const parsed = parseTodoLines(lines);
    todoTasks.push(...parsed);
    saveTodos();
    updateTodoFilters();
    renderTodoList();
  };
  reader.readAsText(file);
});

  document.getElementById("toggleTodoSettings").addEventListener("click", () => {
  document.getElementById("todoSettings").classList.toggle("hidden");
});


clearTodoList.addEventListener("click", () => {
  localStorage.removeItem("todoTasks");
  todoTasks = [];
  renderTodoList();
  updateTodoFilters();
});

removeSelectedTodos.addEventListener("click", () => {
  todoTasks = todoTasks.filter(task => !task.completed);
  saveTodos();
  renderTodoList();
  updateTodoFilters();
});

loadTodos();

});
