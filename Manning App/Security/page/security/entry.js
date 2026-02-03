import { sections } from "../../shared/constants.js";
import { loadHistory, saveAttendance } from "../../shared/securityStorage.js";
import { loadEmployeeIndex, getEmployeeByToken } from "../../shared/employeeIndex.js";

/* ---------- PARAMS ---------- */
const params = new URLSearchParams(location.search);
const editId = params.get("id");

/* ---------- ELEMENTS ---------- */
const sectionsContainer = document.getElementById("sectionsContainer");
const tabsContainer = document.getElementById("sectionTabs");
const saveBtn = document.getElementById("saveBtn");
const mobileSaveBtn = document.getElementById("mobileSaveBtn");

const officerInput = document.getElementById("officerName");
const shiftSelect = document.getElementById("shiftSelect");
const dateInput = document.getElementById("attendanceDate");

const tokenInput = document.getElementById("tokenInput");
const addTokenBtn = document.getElementById("addTokenBtn");

const saveToast = document.getElementById("saveToast");

const openSummaryBtn = document.getElementById("openSummary");
const closeSummaryBtn = document.getElementById("closeSummary");
const mobileSummarySheet = document.getElementById("mobileSummarySheet");

const employeeModal = document.getElementById("employeeModal");
const closeEmployeeModal = document.getElementById("closeEmployeeModal");
const empTokenEl = document.getElementById("empToken");
const empNameEl = document.getElementById("empName");
const empPhoneEl = document.getElementById("empPhone");

/* ---------- ACTIVE SECTION ---------- */
let activeSection = sections[0];

/* ---------- DIRTY STATE (STEP 5.3) ---------- */
let isDirty = false;

/* ---------- EMPLOYEE INDEX READY ---------- */
let employeeIndexReady = false;

/* ---------- STATE ---------- */
const sectionState = {};
sections.forEach(s => (sectionState[s] = []));

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

/* ---------- RENDER SECTIONS (DISPLAY ONLY) ---------- */
sections.forEach(section => {
  const box = document.createElement("div");
  box.className =
    "section bg-white rounded-2xl p-4 shadow-md";
  box.dataset.section = section;

  box.innerHTML = `
    <h3 class="text-slate-700 font-medium mb-2">${section}</h3>
    <div class="token-chips flex flex-wrap gap-2 mb-2" id="chips-${section}"></div>
  `;

  sectionsContainer.appendChild(box);
});

/* ---------- ACTIVE SECTION VISIBILITY ---------- */
function updateActiveSection() {
  document.querySelectorAll(".section").forEach(sec => {
    sec.style.display =
      sec.dataset.section === activeSection ? "block" : "none";
  });

  document.querySelectorAll("#sectionTabs button").forEach(btn => {
    btn.className =
      btn.dataset.section === activeSection
        ? "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-blue-600 text-white"
        : "px-4 py-2 rounded-full text-sm whitespace-nowrap bg-slate-200 text-slate-700";
  });

  tokenInput.placeholder = `Add token to ${activeSection}`;
}

/* ---------- LONG PRESS ---------- */
function attachLongPress(el, callback, delay = 500) {
  let timer;

  const start = () => {
    timer = setTimeout(callback, delay);
  };
  const cancel = () => clearTimeout(timer);

  el.addEventListener("touchstart", start);
  el.addEventListener("mousedown", start);

  el.addEventListener("touchend", cancel);
  el.addEventListener("touchmove", cancel);
  el.addEventListener("mouseup", cancel);
  el.addEventListener("mouseleave", cancel);
}

/* ---------- ADD TOKEN (GLOBAL INPUT) ---------- */
function addTokenToActiveSection() {
  const token = tokenInput.value.trim();
  if (!token) return;

  sectionState[activeSection].push(token);
  isDirty = true;

  const chip = document.createElement("div");
  chip.className =
    "px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 flex items-center gap-1";
  chip.innerHTML = `${token} <span>&times;</span>`;

  chip.querySelector("span").className =
    "cursor-pointer font-bold ml-1";

  chip.querySelector("span").onclick = () => {
    sectionState[activeSection] =
      sectionState[activeSection].filter(t => t !== token);
    chip.remove();
    isDirty = true;
    updateSummary();
  };

  // Long press to open employee modal
  let longPressTimer;
  const startLongPress = () => {
    longPressTimer = setTimeout(() => {
      openEmployeeModal(token);
    }, 500); // 500ms for long press
  };
  const cancelLongPress = () => {
    clearTimeout(longPressTimer);
  };

  chip.addEventListener("mousedown", startLongPress);
  chip.addEventListener("mouseup", cancelLongPress);
  chip.addEventListener("mouseleave", cancelLongPress); // Cancel if mouse leaves
  chip.addEventListener("touchstart", startLongPress);
  chip.addEventListener("touchend", cancelLongPress);

  document
    .getElementById(`chips-${activeSection}`)
    .appendChild(chip);

  tokenInput.value = "";
  tokenInput.focus();
  updateSummary();
}

/* ---------- TOKEN INPUT EVENTS ---------- */
addTokenBtn.onclick = addTokenToActiveSection;

tokenInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTokenToActiveSection();
});

/* ---------- SUMMARY LOGIC ---------- */
function updateSummary() {
  let present = 0;
  let absent = sectionState["Absent"].length;

  const roasting = 
    sectionState["Roasting"].length;

  const plant =
    sectionState["Plant"].length +
    sectionState["Plant Absent Coverage"].length;

  const packing =
    sectionState["Packing"].length +
    sectionState["Packing Absent Coverage"].length;

  sections.forEach(sec => {
    if (sec !== "Absent") present += sectionState[sec].length;
  });

  // Desktop
  summaryMap.roasting.innerText = roasting;
  summaryMap.present.innerText = present;
  summaryMap.absent.innerText = absent;
  summaryMap.plant.innerText = plant;
  summaryMap.packing.innerText = packing;
  summaryMap.lab.innerText = sectionState["Lab"].length;
  summaryMap.boiler.innerText = sectionState["Boiler"].length;
  summaryMap.etp.innerText = sectionState["ETP"].length;
  summaryMap.pallet.innerText = sectionState["Pallet Operating"].length;
  summaryMap.material.innerText = sectionState["Material Handling"].length;
  summaryMap.electrical.innerText = sectionState["Electrical"].length;
  summaryMap.engineering.innerText = sectionState["Engineering"].length;

  // Mobile
  document.getElementById("m-count-roasting").innerText = roasting;
  document.getElementById("m-count-present").innerText = present;
  document.getElementById("m-count-absent").innerText = absent;
  document.getElementById("m-count-plant").innerText = plant;
  document.getElementById("m-count-packing").innerText = packing;
  document.getElementById("m-count-lab").innerText = sectionState["Lab"].length;
  document.getElementById("m-count-boiler").innerText = sectionState["Boiler"].length;
  document.getElementById("m-count-etp").innerText = sectionState["ETP"].length;
  document.getElementById("m-count-pallet").innerText = sectionState["Pallet Operating"].length;
  document.getElementById("m-count-material").innerText = sectionState["Material Handling"].length;
  document.getElementById("m-count-electrical").innerText = sectionState["Electrical"].length;
  document.getElementById("m-count-engineering").innerText = sectionState["Engineering"].length;
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
    officerInput.value = rec.officerName;
    shiftSelect.value = rec.shift;
    dateInput.value = rec.date;

    // Update save button text for edit mode
    if (saveBtn) saveBtn.textContent = "Re-Save Attendance";
    if (mobileSaveBtn) mobileSaveBtn.textContent = "Re-Save Attendance";

    Object.keys(rec.sections).forEach(section => {
      rec.sections[section].forEach(token => {
        sectionState[section].push(token);

        const chip = document.createElement("div");
        chip.className =
          "px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700 flex items-center gap-1";
        chip.innerHTML = `${token} <span>&times;</span>`;

        chip.querySelector("span").className =
          "cursor-pointer font-bold ml-1";

        chip.querySelector("span").onclick = () => {
          sectionState[section] =
            sectionState[section].filter(t => t !== token);
          chip.remove();
          isDirty = true;
          updateSummary();
        };

        // Long press to open employee modal
        let longPressTimer;
        const startLongPress = () => {
          longPressTimer = setTimeout(() => {
            openEmployeeModal(token);
          }, 500); // 500ms for long press
        };
        const cancelLongPress = () => {
          clearTimeout(longPressTimer);
        };

        chip.addEventListener("mousedown", startLongPress);
        chip.addEventListener("mouseup", cancelLongPress);
        chip.addEventListener("mouseleave", cancelLongPress); // Cancel if mouse leaves
        chip.addEventListener("touchstart", startLongPress);
        chip.addEventListener("touchend", cancelLongPress);

        document
          .getElementById(`chips-${section}`)
          .appendChild(chip);
      });
    });

    updateSummary();
  }
}

/* ---------- EMPLOYEE MODAL ---------- */
function openEmployeeModal(token) {
  const emp = getEmployeeByToken(token);

  empTokenEl.innerText = token;
  empNameEl.innerText = emp ? emp.NAME : "Unknown";
  empPhoneEl.innerText = emp?.["PH.NO"]?.[0] || "N/A";

  employeeModal.classList.remove("hidden");
  navigator.vibrate?.(15);
}

/* ---------- MODAL EVENTS ---------- */
function initEmployeeModalEvents() {
  const copyTokenBtn = document.getElementById("copyTokenBtn");
  const copyPhoneBtn = document.getElementById("copyPhoneBtn");

  if (copyTokenBtn) {
    copyTokenBtn.onclick = async () => {
      await navigator.clipboard.writeText(empTokenEl.innerText);
      navigator.vibrate?.(20);
    };
  }

  if (copyPhoneBtn) {
    copyPhoneBtn.onclick = async () => {
      await navigator.clipboard.writeText(empPhoneEl.innerText);
      navigator.vibrate?.(20);
    };
  }

  closeEmployeeModal.onclick = () =>
    employeeModal.classList.add("hidden");

  employeeModal.onclick = e => {
    if (e.target === employeeModal) {
      employeeModal.classList.add("hidden");
    }
  };
}

/* ---------- SAVE (DESKTOP + MOBILE) ---------- */
saveBtn.onclick = () => {
  if (!dateInput.value || !shiftSelect.value || !officerInput.value) {
    alert("Date, shift and officer name are required");
    return;
  }

saveAttendance({
  id: editId,
  date: dateInput.value,
  shift: shiftSelect.value,
  officerName: officerInput.value,
  sections: sectionState,
  counts: {
    present: Number(summaryMap.present.innerText),
    absent: Number(summaryMap.absent.innerText),

    roasting: sectionState["Roasting"].length,

    plant:
      sectionState["Plant"].length +
      sectionState["Plant Absent Coverage"].length,

    packing:
      sectionState["Packing"].length +
      sectionState["Packing Absent Coverage"].length,

    lab: sectionState["Lab"].length,
    boiler: sectionState["Boiler"].length,
    etp: sectionState["ETP"].length,
    pallet: sectionState["Pallet Operating"].length,
    material: sectionState["Material Handling"].length,
    electrical: sectionState["Electrical"].length,
    engineering: sectionState["Engineering"].length
  }
});


  isDirty = false;

  if (saveToast) {
    saveToast.classList.remove("opacity-0");
    setTimeout(() => saveToast.classList.add("opacity-0"), 2000);
  }

  setTimeout(() => {
    location.href = "landing.html";
  }, 600);
};

/* ---------- MOBILE SAVE BUTTON (STEP 5.2) ---------- */
if (mobileSaveBtn) {
  mobileSaveBtn.onclick = () => saveBtn.click();
}

/* ---------- UNSAVED CHANGES GUARD (STEP 5.3) ---------- */
[dateInput, shiftSelect, officerInput].forEach(el => {
  el.addEventListener("change", () => {
    isDirty = true;
  });
});

window.addEventListener("beforeunload", e => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

if (mobileSaveBtn) mobileSaveBtn.onclick = () => saveBtn.click();

/* ---------- EMPLOYEE DATA ---------- */
async function initEmployees() {
  await loadEmployeeIndex();
  employeeIndexReady = true;
}
initEmployees();
initEmployeeModalEvents();

/* ---------- INIT ---------- */
addTokenBtn.onclick = addTokenToActiveSection;
tokenInput.addEventListener("keydown", e => {
  if (e.key === "Enter") addTokenToActiveSection();
});

/* ---------- INIT ---------- */
updateActiveSection();
updateSummary(); // ensure initial state is correct

