
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
const categoryCheckboxes = document.getElementById("spinnerCategoryCheckboxes");
const manualSelectContainer = document.getElementById("manualSelectContainer");
const displayResult = document.getElementById("spinnerResultDisplay");
const resultSoundInput = document.getElementById("resultSound");
const clickSoundInput = document.getElementById("clickSound");
const spinSoundInput = document.getElementById("spinSound");
const volumeControl = document.getElementById("volumeControl");

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

  selectedItems.forEach((item, i) => {
    const startAngle = i * angleStep + angle;
    const endAngle = startAngle + angleStep;
    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, startAngle, endAngle);
    ctx.fillStyle = item.color || `hsl(${(i * 360) / numItems}, 70%, 70%)`;
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

function playSound(url) {
  if (!url) return;
  const audio = new Audio(url);
  audio.volume = parseFloat(volumeControl.value);
  audio.play();
}

function spinWheel() {
  if (spinning || selectedItems.length === 0) return;
  playSound(clickSoundInput.value);
  spinning = true;
  let duration = 4000;
  let start = null;
  const spinAngle = Math.random() * 360 + 720;

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
      const degrees = (angle * 180) / Math.PI % 360;
      const index = Math.floor((selectedItems.length - (degrees / 360) * selectedItems.length)) % selectedItems.length;
      const selected = selectedItems[index];
      playSound(spinSoundInput.value);
      setTimeout(() => {
        playSound(resultSoundInput.value);
        showConfetti();
        displayResult.textContent = selected.text;
      }, 300);
    }
  }

  animate(performance.now());
}

function showConfetti() {
  const confetti = document.createElement("div");
  confetti.classList.add("confetti");
  document.body.appendChild(confetti);
  setTimeout(() => document.body.removeChild(confetti), 1000);
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
  categoryCheckboxes.innerHTML = "";
  [...categories].forEach(cat => {
    const label = document.createElement("label");
    label.innerHTML = `<input type="checkbox" value="${cat}" checked> ${cat}`;
    categoryCheckboxes.appendChild(label);
  });
  categoryCheckboxes.querySelectorAll("input").forEach(cb => cb.addEventListener("change", updateManualSelect));
}

function updateManualSelect() {
  const selectedCategories = [...categoryCheckboxes.querySelectorAll("input:checked")].map(cb => cb.value);
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

spinBtn.addEventListener("click", spinWheel);
toggleSpinnerSettings.addEventListener("click", () => {
  spinnerSettings.classList.toggle("hidden");
});

// Initial Load
loadFromLocalStorage();
updateManualSelect();
drawWheel();
