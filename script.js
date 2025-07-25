// script.js - core logic for the Cannabis Strain Tracker web app

// Predefined lists for effects and common terpenes
const EFFECTS = [
  "Relaxed",
  "Creative",
  "Anxious",
  "Sleepy",
  "Euphoric",
  "Focused",
  "Pain Relief",
  "Appetite Boost",
  "Giggly",
  "Dry Mouth",
  "Paranoia",
  "Couch-locked",
];

const DEFAULT_TERPENES = [
  "Limonene",
  "Myrcene",
  "Pinene",
  "Caryophyllene",
  "Linalool",
  "Humulene",
  "Terpinolene",
  "Ocimene",
];

// IndexedDB helpers
const DB_NAME = "strainTrackerDB";
const LOG_STORE = "logs";

/**
 * Open (or create) the IndexedDB database.
 * Returns a promise that resolves with the database instance.
 */
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = event => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(LOG_STORE)) {
        db.createObjectStore(LOG_STORE, { keyPath: "id", autoIncrement: true });
      }
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Add a new log entry to the database.
 * @param {Object} logEntry
 */
function addLogToDB(logEntry) {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOG_STORE, "readwrite");
      const store = tx.objectStore(LOG_STORE);
      const req = store.add(logEntry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Retrieve all log entries from the database.
 * @returns {Promise<Array>}
 */
function getAllLogsFromDB() {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOG_STORE, "readonly");
      const store = tx.objectStore(LOG_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Clear all log entries from the database.
 */
function clearLogsFromDB() {
  return openDatabase().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(LOG_STORE, "readwrite");
      const store = tx.objectStore(LOG_STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  });
}

/**
 * Save available strains and terpenes lists to localStorage.
 */
function saveListsToStorage(strains, terpenes) {
  localStorage.setItem("strainsList", JSON.stringify(strains));
  localStorage.setItem("terpenesList", JSON.stringify(terpenes));
}

/**
 * Load available strains and terpenes from localStorage.
 */
function loadListsFromStorage() {
  const strains = JSON.parse(localStorage.getItem("strainsList")) || [];
  const terpenes = JSON.parse(localStorage.getItem("terpenesList")) || [];
  return { strains, terpenes };
}

/**
 * Initialize the application.
 */
function init() {
  // DOM elements
  const pages = document.querySelectorAll(".page");
  const navItems = document.querySelectorAll(".nav-item");
  const logsListEl = document.getElementById("logs-list");
  const noLogsMessageEl = document.getElementById("no-logs-message");
  const statsEl = document.getElementById("stats");
  const statFavStrain = document.getElementById("stat-fav-strain");
  const statFavTerpene = document.getElementById("stat-fav-terpene");
  const statFavEffect = document.getElementById("stat-fav-effect");

  const logForm = document.getElementById("log-form");
  const strainInput = document.getElementById("strain-name");
  const strainOptions = document.getElementById("strain-options");
  const terpeneListEl = document.getElementById("terpene-list");
  const newTerpeneInput = document.getElementById("new-terpene-input");
  const addTerpeneBtn = document.getElementById("add-terpene-btn");
  const effectsInputsContainer = document.getElementById("effects-inputs");
  const potencyRange = document.getElementById("potency");
  const potencyValue = document.getElementById("potency-value");

  const recommendInputsContainer = document.getElementById("recommend-inputs");
  const getRecommendationsBtn = document.getElementById("get-recommendations-btn");
  const recommendResultsEl = document.getElementById("recommend-results");

  const exportBtn = document.getElementById("export-btn");
  const importBtn = document.getElementById("import-btn");
  const importInput = document.getElementById("import-input");
  const clearDataBtn = document.getElementById("clear-data-btn");
  const goToLogBtn = document.getElementById("go-to-log-btn");

  // Load available lists
  let { strains: availableStrains, terpenes: availableTerpenes } = loadListsFromStorage();
  if (availableTerpenes.length === 0) {
    availableTerpenes = [...DEFAULT_TERPENES];
  }

  // State for current log (selected terpenes)
  let selectedTerpenes = [];

  // Helper to update datalist of strain options
  function updateStrainDatalist() {
    strainOptions.innerHTML = "";
    availableStrains.forEach(name => {
      const option = document.createElement("option");
      option.value = name;
      strainOptions.appendChild(option);
    });
  }

  // Helper to render selected terpenes as chips
  function renderSelectedTerpenes() {
    terpeneListEl.innerHTML = "";
    selectedTerpenes.forEach((t, index) => {
      const chip = document.createElement("div");
      chip.className = "terpene-item";
      chip.textContent = t;
      const removeBtn = document.createElement("button");
      removeBtn.type = "button";
      removeBtn.textContent = "×";
      removeBtn.addEventListener("click", () => {
        selectedTerpenes.splice(index, 1);
        renderSelectedTerpenes();
      });
      chip.appendChild(removeBtn);
      terpeneListEl.appendChild(chip);
    });
  }

  // Create effect input sliders for a given container
  function createEffectInputs(container) {
    container.innerHTML = "";
    EFFECTS.forEach(effectName => {
      const row = document.createElement("div");
      row.className = "effect-row";
      const label = document.createElement("label");
      label.textContent = effectName;
      const slider = document.createElement("input");
      slider.type = "range";
      slider.min = "0";
      slider.max = "10";
      slider.step = "1";
      slider.value = "0";
      slider.dataset.effect = effectName;
      const valueSpan = document.createElement("span");
      valueSpan.className = "effect-value";
      valueSpan.textContent = "0";
      slider.addEventListener("input", () => {
        valueSpan.textContent = slider.value;
        // Haptic feedback if supported
        if (navigator.vibrate) {
          navigator.vibrate(5);
        }
      });
      row.appendChild(label);
      row.appendChild(slider);
      row.appendChild(valueSpan);
      container.appendChild(row);
    });
  }

  // Render both log and recommendation effect inputs
  createEffectInputs(effectsInputsContainer);
  createEffectInputs(recommendInputsContainer);

  // Update potency display
  potencyRange.addEventListener("input", () => {
    potencyValue.textContent = potencyRange.value;
    if (navigator.vibrate) navigator.vibrate(5);
  });

  // Navigation logic
  navItems.forEach(item => {
    item.addEventListener("click", () => {
      // Deactivate all nav buttons
      navItems.forEach(btn => btn.classList.remove("active"));
      item.classList.add("active");
      // Show the corresponding page
      const target = item.getAttribute("data-target");
      pages.forEach(page => {
        if (page.id === target) {
          page.classList.add("active");
        } else {
          page.classList.remove("active");
        }
      });
    });
  });

  // Quick nav from empty state message
  if (goToLogBtn) {
    goToLogBtn.addEventListener("click", () => {
      document.querySelector('.nav-item[data-target="log"]').click();
    });
  }

  // Add terpene event
  addTerpeneBtn.addEventListener("click", () => {
    const value = newTerpeneInput.value.trim();
    if (!value) return;
    // Avoid duplicates in selected list
    if (!selectedTerpenes.includes(value)) {
      selectedTerpenes.push(value);
      renderSelectedTerpenes();
    }
    // Add to available list if not exists
    if (!availableTerpenes.includes(value)) {
      availableTerpenes.push(value);
      saveListsToStorage(availableStrains, availableTerpenes);
    }
    newTerpeneInput.value = "";
  });

  // Render datalist for strains
  updateStrainDatalist();

  // Handle log form submission
  logForm.addEventListener("submit", async event => {
    event.preventDefault();
    const strainName = strainInput.value.trim();
    if (!strainName) return;
    // Read effect values
    const effectRatings = {};
    effectsInputsContainer.querySelectorAll('input[type="range"]').forEach(slider => {
      const effName = slider.dataset.effect;
      effectRatings[effName] = parseInt(slider.value, 10);
    });
    // Read potency
    const potency = parseInt(potencyRange.value, 10);
    // Prepare log entry
    const logEntry = {
      strainName,
      terpenes: [...selectedTerpenes],
      effects: effectRatings,
      potency,
      timestamp: Date.now(),
    };
    try {
      await addLogToDB(logEntry);
      // Update available strains list
      if (!availableStrains.includes(strainName)) {
        availableStrains.push(strainName);
        saveListsToStorage(availableStrains, availableTerpenes);
        updateStrainDatalist();
      }
      // Reset form
      logForm.reset();
      potencyValue.textContent = "5";
      selectedTerpenes = [];
      renderSelectedTerpenes();
      // Reset effect sliders values and displays
      effectsInputsContainer.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.value = "0";
        slider.nextElementSibling.textContent = "0";
      });
      // Feedback vibration
      if (navigator.vibrate) navigator.vibrate([10, 50, 10]);
      // Refresh logs view
      await renderLogsAndStats();
      // Navigate back to home
      document.querySelector('.nav-item[data-target="home"]').click();
    } catch (err) {
      console.error('Error saving log:', err);
      alert('Failed to save log.');
    }
  });

  // Render logs and statistics
  async function renderLogsAndStats() {
    const logs = await getAllLogsFromDB();
    // Sort logs by timestamp descending
    logs.sort((a, b) => b.timestamp - a.timestamp);
    logsListEl.innerHTML = "";
    if (logs.length === 0) {
      noLogsMessageEl.classList.remove("hidden");
      statsEl.classList.add("hidden");
    } else {
      noLogsMessageEl.classList.add("hidden");
      // Render each log item
      logs.forEach(log => {
        const li = document.createElement("li");
        // Header with strain name and potency
        const header = document.createElement("div");
        header.className = "log-header";
        const nameEl = document.createElement("span");
        nameEl.textContent = log.strainName;
        const potencyEl = document.createElement("span");
        potencyEl.textContent = `Intensity: ${log.potency}`;
        header.appendChild(nameEl);
        header.appendChild(potencyEl);
        // Body with terpenes and top effects
        const body = document.createElement("div");
        body.className = "log-body";
        let bodyParts = [];
        if (log.terpenes && log.terpenes.length) {
          bodyParts.push(`Terpenes: ${log.terpenes.join(', ')}`);
        }
        // Determine top three effects (>0)
        const effectEntries = Object.entries(log.effects || {});
        const topEffects = effectEntries
          .filter(([_, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([name]) => name);
        if (topEffects.length > 0) {
          bodyParts.push(`Top effects: ${topEffects.join(', ')}`);
        }
        body.textContent = bodyParts.join(' | ');
        li.appendChild(header);
        li.appendChild(body);
        logsListEl.appendChild(li);
      });
      // Compute and display stats
      computeAndDisplayStats(logs);
    }
  }

  // Compute quick statistics
  function computeAndDisplayStats(logs) {
    // Favorite strain: most logged strain
    const strainCount = {};
    logs.forEach(log => {
      strainCount[log.strainName] = (strainCount[log.strainName] || 0) + 1;
    });
    const favStrain = Object.entries(strainCount).sort((a, b) => b[1] - a[1])[0];
    statFavStrain.textContent = favStrain ? favStrain[0] : '—';
    // Favorite terpene
    const terpCount = {};
    logs.forEach(log => {
      (log.terpenes || []).forEach(t => {
        terpCount[t] = (terpCount[t] || 0) + 1;
      });
    });
    const favTerp = Object.entries(terpCount).sort((a, b) => b[1] - a[1])[0];
    statFavTerpene.textContent = favTerp ? favTerp[0] : '—';
    // Most common effect
    const effectTotals = {};
    logs.forEach(log => {
      Object.entries(log.effects || {}).forEach(([eff, val]) => {
        effectTotals[eff] = (effectTotals[eff] || 0) + val;
      });
    });
    const favEffect = Object.entries(effectTotals).sort((a, b) => b[1] - a[1])[0];
    statFavEffect.textContent = favEffect ? favEffect[0] : '—';
    statsEl.classList.remove("hidden");
  }

  // Compute strain vectors (average effect scores for each strain)
  function computeStrainVectors(logs) {
    const vectors = {};
    const counts = {};
    logs.forEach(log => {
      const name = log.strainName;
      if (!vectors[name]) {
        vectors[name] = Array(EFFECTS.length).fill(0);
        counts[name] = 0;
      }
      EFFECTS.forEach((eff, idx) => {
        vectors[name][idx] += log.effects[eff] || 0;
      });
      counts[name]++;
    });
    Object.keys(vectors).forEach(name => {
      const count = counts[name];
      vectors[name] = vectors[name].map(val => (count ? val / count : 0));
    });
    return vectors;
  }

  // Cosine similarity between two vectors
  function cosineSimilarity(a, b) {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    if (normA === 0 || normB === 0) return 0;
    return dot / (normA * normB);
  }

  // Handle recommendations
  getRecommendationsBtn.addEventListener("click", async () => {
    const desiredVector = [];
    // Build desired vector from recommend inputs
    recommendInputsContainer.querySelectorAll('input[type="range"]').forEach(slider => {
      desiredVector.push(parseInt(slider.value, 10));
    });
    const logs = await getAllLogsFromDB();
    if (logs.length === 0) {
      recommendResultsEl.innerHTML = '<p class="empty-state">No logs available to generate recommendations.</p>';
      return;
    }
    const strainVectors = computeStrainVectors(logs);
    // Compute similarity for each strain
    const results = Object.entries(strainVectors).map(([name, vec]) => {
      const sim = cosineSimilarity(vec, desiredVector);
      return { name, similarity: sim };
    });
    // Sort by similarity descending and take top 3
    results.sort((a, b) => b.similarity - a.similarity);
    const topResults = results.slice(0, 3);
    // Render results
    if (topResults.length === 0) {
      recommendResultsEl.innerHTML = '<p class="empty-state">No suitable matches found.</p>';
    } else {
      recommendResultsEl.innerHTML = "";
      topResults.forEach(({ name, similarity }) => {
        const div = document.createElement("div");
        div.className = "recommend-item";
        const title = document.createElement("h4");
        title.textContent = name;
        const p = document.createElement("p");
        const percent = Math.round(similarity * 100);
        p.textContent = `Match: ${percent}%`;
        div.appendChild(title);
        div.appendChild(p);
        recommendResultsEl.appendChild(div);
      });
    }
  });

  // Export data to JSON
  exportBtn.addEventListener("click", async () => {
    const logs = await getAllLogsFromDB();
    const data = {
      logs,
      strains: availableStrains,
      terpenes: availableTerpenes,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "strain-tracker-data.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  // Import data from JSON
  importBtn.addEventListener("click", () => {
    importInput.click();
  });
  importInput.addEventListener("change", async event => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const data = JSON.parse(e.target.result);
        if (data.logs && Array.isArray(data.logs)) {
          // Clear existing logs and import new logs
          await clearLogsFromDB();
          for (const log of data.logs) {
            await addLogToDB(log);
          }
        }
        // Update lists
        if (data.strains && Array.isArray(data.strains)) {
          availableStrains = data.strains;
        }
        if (data.terpenes && Array.isArray(data.terpenes)) {
          availableTerpenes = data.terpenes;
        }
        saveListsToStorage(availableStrains, availableTerpenes);
        updateStrainDatalist();
        renderSelectedTerpenes();
        await renderLogsAndStats();
        alert('Data imported successfully.');
      } catch (err) {
        console.error(err);
        alert('Invalid JSON file.');
      }
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  // Clear all data
  clearDataBtn.addEventListener("click", async () => {
    if (!confirm('Are you sure you want to delete all data?')) return;
    await clearLogsFromDB();
    availableStrains = [];
    availableTerpenes = [...DEFAULT_TERPENES];
    saveListsToStorage(availableStrains, availableTerpenes);
    updateStrainDatalist();
    selectedTerpenes = [];
    renderSelectedTerpenes();
    await renderLogsAndStats();
    alert('All data cleared.');
  });

  // Initial render of logs and stats
  renderLogsAndStats();
  renderSelectedTerpenes();
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);