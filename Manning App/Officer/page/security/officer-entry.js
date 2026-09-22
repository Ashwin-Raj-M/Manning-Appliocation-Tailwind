import { sections, workstationsBySection } from "../../shared/officer-constants.js";
import { loadHistory, saveAttendance } from "../../shared/officer-storage.js";
import { loadEmployeeIndex, getEmployeeByToken } from "../../shared/officer-employee-index.js";

/* ---------- PARAMS ---------- */
const params = new URLSearchParams(location.search);
const editId = params.get("id");

/* ---------- ELEMENTS ---------- */
const workstationsContainer = document.getElementById("workstationsContainer");
const tabsContainer = document.getElementById("sectionTabs");
const saveBtn = document.getElementById("saveBtn");
const mobileSaveBtn = document.getElementById("mobileSaveBtn");

const officerInput = document.getElementById("officerName");
const shiftSelect = document.getElementById("shiftSelect");
const dateInput = document.getElementById("attendanceDate");

const saveToast = document.getElementById("saveToast");

const openSummaryBtn = document.getElementById("openSummary");
const closeSummaryBtn = document.getElementById("closeSummary");
const mobileSummarySheet = document.getElementById("mobileSummarySheet");

/* ---------- SHIFT EDIT ELEMENTS ---------- */
const editShiftBtn = document.getElementById("editShiftBtn");
const shiftDisplayMode = document.getElementById("shiftDisplayMode");
const shiftEditMode = document.getElementById("shiftEditMode");
const editAttendanceDate = document.getElementById("editAttendanceDate");
const editShiftSelect = document.getElementById("editShiftSelect");
const editOfficerName = document.getElementById("editOfficerName");
const cancelShiftEdit = document.getElementById("cancelShiftEdit");
const saveShiftEdit = document.getElementById("saveShiftEdit");

/* ---------- BUFFER MODAL ELEMENTS ---------- */
const addToBufferBtn = document.getElementById("addToBufferBtn");
const addToBufferModal = document.getElementById("addToBufferModal");
const bufferModalBackdrop = document.getElementById("bufferModalBackdrop");
const bufferTokenInput = document.getElementById("bufferTokenInput");
const cancelAddToBuffer = document.getElementById("cancelAddToBuffer");
const confirmAddToBuffer = document.getElementById("confirmAddToBuffer");
const bufferContainer = document.getElementById("bufferContainer");

console.log('Containers found:', { unassignedContainer, bufferContainer });

/* ---------- ACTIVE SECTION ---------- */
let activeSection = sections[0];

/* ---------- DIRTY STATE (STEP 5.3) ---------- */
let isDirty = false;

/* ---------- HELPER FUNCTIONS ---------- */
// Helper function to create safe CSS selector from workstation name
function createWorkstationId(workstation) {
  return workstation
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-zA-Z0-9\-_]/g, match => '\\' + match) // Escape special characters
    .toLowerCase();
}

/* ---------- STATE ---------- */
const sectionState = {};
const workstationState = {};

console.log('Sections:', sections);
console.log('SectionState before init:', sectionState);

sections.forEach(section => {
  sectionState[section] = [];
  workstationState[section] = {};
  (workstationsBySection[section] || []).forEach(ws => {
    workstationState[section][ws] = [];
  });
});

console.log('SectionState after init:', sectionState);

/* ---------- SUMMARY MAP ---------- */
const summaryMap = {
  roasting: document.getElementById("count-roasting"),
  present: document.getElementById("count-present"),
  absent: document.getElementById("count-absent"),
  plant: document.getElementById("count-plant"),
  packing: document.getElementById("count-packing"),
  lab: document.getElementById("count-lab"),
  boiler: document.getElementById("count-boiler"),
  etp: document.getElementById("count-etp"),
  pallet: document.getElementById("count-pallet"),
  material: document.getElementById("count-material"),
  electrical: document.getElementById("count-electrical"),
  engineering: document.getElementById("count-engineering")
};

/* ---------- SECTION TABS ---------- */
sections.forEach(section => {
  const tab = document.createElement("button");
  tab.innerText = section;
  tab.dataset.section = section;
  tab.className =
    "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-slate-200 text-slate-700";

  tab.onclick = () => {
    activeSection = section;
    updateActiveSection();
  };

  tabsContainer.appendChild(tab);
});

/* ---------- ACTIVE SECTION VISIBILITY ---------- */
function updateActiveSection() {
  // Update tab styling
  document.querySelectorAll("#sectionTabs button").forEach(btn => {
    btn.className =
      btn.dataset.section === activeSection
        ? "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-blue-600 text-white"
        : "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-slate-200 text-slate-700";
  });

  // Clear existing workstations
  workstationsContainer.innerHTML = "";

  // Get workstations for active section
  const workstations = workstationsBySection[activeSection] || [];

  // Create workstation boxes
  workstations.forEach(workstation => {
    const workstationBox = document.createElement("div");
    workstationBox.className = "bg-white rounded-2xl shadow-md p-4";
    workstationBox.innerHTML = `
      <div class="text-sm font-medium text-slate-700 mb-2">${workstation}</div>
      <div id="workstation-${createWorkstationId(workstation)}" class="space-y-2 min-h-[60px]">
        <!-- Tokens will be added here -->
      </div>
    `;
    workstationsContainer.appendChild(workstationBox);

    // Populate with existing tokens
    const container = workstationBox.querySelector(`#workstation-${createWorkstationId(workstation)}`);
    // Make workstation droppable
    makeDroppable(container, token => {
      removeTokenEverywhere(token);

      sectionState[activeSection].push(token);
      workstationState[activeSection][workstation].push(token);

      container.appendChild(createDraggableToken(token));
    });
    const tokens = workstationState[activeSection][workstation] || [];
    tokens.forEach(token => {
      container.appendChild(createDraggableToken(token));
    });

  });
}

/* ---------- SUMMARY LOGIC ---------- */
function updateSummary() {
  let present = 0;
  let absent = sectionState["Absent"] ? sectionState["Absent"].length : 0;

  const roasting = sectionState["Roasting"] ? sectionState["Roasting"].length : 0;
  const plant = sectionState["Plant"] ? sectionState["Plant"].length : 0;
  const packing = sectionState["Packing"] ? sectionState["Packing"].length : 0;

  sections.forEach(sec => {
    if (sec !== "Absent") present += sectionState[sec] ? sectionState[sec].length : 0;
  });

  // Desktop
  summaryMap.roasting.innerText = roasting;
  summaryMap.present.innerText = present;
  summaryMap.absent.innerText = absent;
  summaryMap.plant.innerText = plant;
  summaryMap.packing.innerText = packing;
  summaryMap.lab.innerText = sectionState["Lab"] ? sectionState["Lab"].length : 0;
  summaryMap.boiler.innerText = sectionState["Boiler"] ? sectionState["Boiler"].length : 0;
  summaryMap.etp.innerText = sectionState["ETP"] ? sectionState["ETP"].length : 0;
  summaryMap.pallet.innerText = sectionState["Pallet Operating"] ? sectionState["Pallet Operating"].length : 0;
  summaryMap.material.innerText = sectionState["Material Handling"] ? sectionState["Material Handling"].length : 0;
  summaryMap.electrical.innerText = sectionState["Electrical"] ? sectionState["Electrical"].length : 0;
  summaryMap.engineering.innerText = sectionState["Engineering"] ? sectionState["Engineering"].length : 0;

  // Mobile
  document.getElementById("m-count-roasting").innerText = roasting;
  document.getElementById("m-count-present").innerText = present;
  document.getElementById("m-count-absent").innerText = absent;
  document.getElementById("m-count-plant").innerText = plant;
  document.getElementById("m-count-packing").innerText = packing;
  document.getElementById("m-count-lab").innerText = sectionState["Lab"] ? sectionState["Lab"].length : 0;
  document.getElementById("m-count-boiler").innerText = sectionState["Boiler"] ? sectionState["Boiler"].length : 0;
  document.getElementById("m-count-etp").innerText = sectionState["ETP"] ? sectionState["ETP"].length : 0;
  document.getElementById("m-count-pallet").innerText = sectionState["Pallet Operating"] ? sectionState["Pallet Operating"].length : 0;
  document.getElementById("m-count-material").innerText = sectionState["Material Handling"] ? sectionState["Material Handling"].length : 0;
  document.getElementById("m-count-electrical").innerText = sectionState["Electrical"] ? sectionState["Electrical"].length : 0;
  document.getElementById("m-count-engineering").innerText = sectionState["Engineering"] ? sectionState["Engineering"].length : 0;
}

if (openSummaryBtn) {
  openSummaryBtn.onclick = () => {
    updateSummary(); //ensure latest data
    mobileSummarySheet.classList.remove("translate-y-full");
  };
}

if (closeSummaryBtn) {
  closeSummaryBtn.onclick = () => {
    mobileSummarySheet.classList.add("translate-y-full");
  };
}


/* ---------- EDIT MODE ---------- */
if (editId) {
  const history = loadHistory();
  const rec = history[editId];
  if (rec) {
    // Populate shift header (read-only on officer page)
    officerInput.textContent = rec.officerName;
    shiftSelect.textContent = rec.shift;
    dateInput.textContent = rec.date;

    // Clear Unassigned first (safety for edit mode)
    unassignedContainer.innerHTML = "";

    // Load ALL tokens into Unassigned
    Object.keys(rec.sections).forEach(section => {
      rec.sections[section].forEach(token => {
        unassignedContainer.appendChild(
          createDraggableToken(token)
        );
      });
    });

    // Summary must start from zero
    updateSummary();
  }
}

/* ---------- SAVE (DESKTOP + MOBILE) ---------- */
saveBtn.onclick = () => {
  if (!dateInput.textContent || !shiftSelect.textContent || !officerInput.textContent) {
    alert("Date, shift and officer name are required");
    return;
  }

saveAttendance({
  id: editId,
  date: dateInput.textContent,
  shift: shiftSelect.textContent,
  officerName: officerInput.textContent,
  sections: sectionState,
  counts: {
    present: Number(summaryMap.present.innerText),
    absent: Number(summaryMap.absent.innerText),

    roasting: sectionState["Roasting"] ? sectionState["Roasting"].length : 0,

    plant:
      (sectionState["Plant"] ? sectionState["Plant"].length : 0) +
      (sectionState["Plant Absent Coverage"] ? sectionState["Plant Absent Coverage"].length : 0),

    packing:
      (sectionState["Packing"] ? sectionState["Packing"].length : 0) +
      (sectionState["Packing Absent Coverage"] ? sectionState["Packing Absent Coverage"].length : 0),

    lab: sectionState["Lab"] ? sectionState["Lab"].length : 0,
    boiler: sectionState["Boiler"] ? sectionState["Boiler"].length : 0,
    etp: sectionState["ETP"] ? sectionState["ETP"].length : 0,
    pallet: sectionState["Pallet Operating"] ? sectionState["Pallet Operating"].length : 0,
    material: sectionState["Material Handling"] ? sectionState["Material Handling"].length : 0,
    electrical: sectionState["Electrical"] ? sectionState["Electrical"].length : 0,
    engineering: sectionState["Engineering"] ? sectionState["Engineering"].length : 0
  }
});


  isDirty = false;

  if (saveToast) {
    saveToast.classList.remove("opacity-0");
    setTimeout(() => saveToast.classList.add("opacity-0"), 2000);
  }

  setTimeout(() => {
    location.href = "officer-landing.html";
  }, 600);
};

/* ---------- MOBILE SAVE BUTTON (STEP 5.2) ---------- */
if (mobileSaveBtn) {
  mobileSaveBtn.onclick = () => saveBtn.click();
}

/* ---------- UNSAVED CHANGES GUARD (STEP 5.3) ---------- */
/* Note: Shift details are display-only, populated by security.
   Only token changes affect the dirty state. */

window.addEventListener("beforeunload", e => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

/* ---------- SHIFT EDIT INLINE FUNCTIONS ---------- */
function openShiftEditMode() {
  // Populate edit inputs with current values
  if (editAttendanceDate && dateInput) {
    // Convert display date back to input format
    const currentDate = new Date(dateInput.textContent);
    editAttendanceDate.value = currentDate.toISOString().split('T')[0];
  }
  if (editShiftSelect && shiftSelect) {
    editShiftSelect.value = shiftSelect.textContent;
  }
  if (editOfficerName && officerInput) {
    editOfficerName.value = officerInput.textContent;
  }

  // Switch to edit mode
  shiftDisplayMode.classList.add("hidden");
  shiftEditMode.classList.remove("hidden");
}

function closeShiftEditMode() {
  // Switch back to display mode
  shiftEditMode.classList.add("hidden");
  shiftDisplayMode.classList.remove("hidden");
}

function saveShiftChanges() {
  // Update display values
  if (editAttendanceDate && dateInput) {
    const selectedDate = new Date(editAttendanceDate.value);
    dateInput.textContent = selectedDate.toLocaleDateString();
  }
  if (editShiftSelect && shiftSelect) {
    shiftSelect.textContent = editShiftSelect.value;
  }
  if (editOfficerName && officerInput) {
    officerInput.textContent = editOfficerName.value;
  }

  // Switch back to display mode
  closeShiftEditMode();
}

/* ---------- SHIFT EDIT EVENT LISTENERS ---------- */
if (editShiftBtn) {
  editShiftBtn.onclick = openShiftEditMode;
}

if (cancelShiftEdit) {
  cancelShiftEdit.onclick = closeShiftEditMode;
}

if (saveShiftEdit) {
  saveShiftEdit.onclick = saveShiftChanges;
}

/* ---------- BUFFER MODAL FUNCTIONS ---------- */
function openBufferModal() {
  bufferTokenInput.value = "";
  bufferTokenInput.focus();
  addToBufferModal.classList.remove("hidden");
}

function closeBufferModal() {
  addToBufferModal.classList.add("hidden");
}

function addTokenToBuffer() {
  const token = bufferTokenInput.value.trim();
  if (!token) return;

  // Create token chip
  const chip = document.createElement("div");
  chip.className =
    "px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 flex items-center gap-1";
  chip.innerHTML = `${token} <span>&times;</span>`;

  chip.querySelector("span").className =
    "cursor-pointer font-bold ml-1";

  chip.querySelector("span").onclick = () => {
    chip.remove();
    isDirty = true;
  };

  bufferContainer.appendChild(chip);
  bufferTokenInput.value = "";
  closeBufferModal();
  isDirty = true;
}

/* ---------- BUFFER MODAL EVENT LISTENERS ---------- */
if (addToBufferBtn) {
  addToBufferBtn.onclick = openBufferModal;
}

if (cancelAddToBuffer) {
  cancelAddToBuffer.onclick = closeBufferModal;
}

if (confirmAddToBuffer) {
  confirmAddToBuffer.onclick = addTokenToBuffer;
}

// Close buffer modal when clicking backdrop
if (bufferModalBackdrop) {
  bufferModalBackdrop.onclick = closeBufferModal;
}

// Handle Enter key in buffer token input
if (bufferTokenInput) {
  bufferTokenInput.addEventListener("keydown", e => {
    if (e.key === "Enter") addTokenToBuffer();
  });
}

/* draggable token creation */

function createDraggableToken(token) {
  const chip = document.createElement("div");
  chip.className =
    "px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 " +
    "flex items-center justify-between gap-2 cursor-move select-none";

  chip.draggable = true;
  chip.dataset.token = token;

  chip.innerHTML = `
    <span>${token}</span>
    <span class="font-bold cursor-pointer">&times;</span>
  `;

  // Drag start
  chip.addEventListener("dragstart", e => {
    e.dataTransfer.setData("text/plain", token);
    e.dataTransfer.effectAllowed = "move";
    chip.classList.add("opacity-50");
  });

  chip.addEventListener("dragend", () => {
    chip.classList.remove("opacity-50");
  });

  // Remove (×)
  chip.querySelector("span:last-child").onclick = () => {
    removeTokenEverywhere(token);
    chip.remove();
    updateSummary();
    isDirty = true;
  };

  return chip;
}

/* ---------- REMOVE TOKEN EVERYWHERE FUNCTION ---------- */

function removeTokenEverywhere(token) {
  // Remove from sectionState
  Object.keys(sectionState).forEach(sec => {
    sectionState[sec] = sectionState[sec].filter(t => t !== token);
  });

  // Remove from workstationState
  Object.keys(workstationState).forEach(sec => {
    Object.keys(workstationState[sec]).forEach(ws => {
      workstationState[sec][ws] =
        workstationState[sec][ws].filter(t => t !== token);
    });
  });

  // Remove from UI
  document.querySelectorAll(`[data-token="${token}"]`)
    .forEach(el => el.remove());
}

/* ---------- MAKE WORKSTATIONS DROPPABLE ---------- */

function makeDroppable(container, onDrop) {
  container.addEventListener("dragover", e => {
    e.preventDefault();
    container.classList.add("bg-blue-50", "border-2", "border-blue-300");
  });

  container.addEventListener("dragleave", () => {
    container.classList.remove("bg-blue-50", "border-2", "border-blue-300");
  });

  container.addEventListener("drop", e => {
    e.preventDefault();
    container.classList.remove("bg-blue-50", "border-2", "border-blue-300");

    const token = e.dataTransfer.getData("text/plain");
    if (!token) return;

    onDrop(token);
    isDirty = true;
    updateSummary();
  });
}


makeDroppable(unassignedContainer, token => {
  removeTokenEverywhere(token);
  unassignedContainer.appendChild(createDraggableToken(token));
});

makeDroppable(bufferContainer, token => {
  removeTokenEverywhere(token);
  bufferContainer.appendChild(createDraggableToken(token));
});

/* ---------- INIT ---------- */
updateActiveSection();
updateSummary(); // ensure initial state is correct

/* ---------- TEMPORARY SHIFT DATA ---------- */
if (officerInput) officerInput.textContent = "Ashwin Raj M";
if (shiftSelect) shiftSelect.textContent = "A";
if (dateInput) dateInput.textContent = new Date().toLocaleDateString();

