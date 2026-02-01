import { loadHistory, deleteAttendance } from "../../shared/securityStorage.js";

document.addEventListener("DOMContentLoaded", () => {

  /* ---------- AUTH CHECK ---------- */
  const auth = JSON.parse(localStorage.getItem("SECURITY_AUTH"));
  if (!auth) {
    location.href = "login.html";
    return;
  }

  /* ---------- ELEMENTS ---------- */
  const userName = document.getElementById("userName");
  const historyList = document.getElementById("historyList");
  const addBtn = document.getElementById("addAttendanceBtn");
  const deleteModal = document.getElementById("deleteModal");
  const deletePasswordInput = document.getElementById("deletePassword");
  const confirmDeleteBtn = document.getElementById("confirmDelete");
  const cancelDeleteBtn = document.getElementById("cancelDelete");

  const menuBtn = document.getElementById("menuBtn");
  const menuDropdown = document.getElementById("menuDropdown");
  const logoutBtn = document.getElementById("logoutBtn");

  let pendingDeleteId = null;


  userName.innerText = auth.name;

  menuBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    menuDropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", () => {
    menuDropdown.classList.add("hidden");
  });

  logoutBtn.addEventListener("click", () => {
      const confirmLogout = confirm("Do you want to logout?");
    if (!confirmLogout) return;

    localStorage.removeItem("SECURITY_AUTH");
    location.href = "login.html";
  });



  /* ---------- RENDER HISTORY ---------- */
  function buildAttendanceReport(rec) {
    return `*Shift Attendance*
    Date - ${rec.date}
    Shift - ${rec.shift}
    Shift Officer - ${rec.officerName}
    --------------------
    Absent - ${rec.counts.absent}
    Present - ${rec.counts.present}
    --------------------
    Roasting - ${rec.counts.roasting ?? 0}
    Plant - ${rec.counts.plant ?? 0}
    Packing - ${rec.counts.packing ?? 0}
    Lab - ${rec.counts.lab ?? 0}
    Boiler - ${rec.counts.boiler ?? 0}
    ETP - ${rec.counts.etp ?? 0}
    Pallet - ${rec.counts.pallet ?? 0}
    Material - ${rec.counts.material ?? 0}
    Electrical - ${rec.counts.electrical ?? 0}
    Engineering - ${rec.counts.engineering ?? 0}`;

  }


  function render() {
    const history = loadHistory();
    historyList.innerHTML = "";

    const records = Object.values(history)
      .sort((a, b) => {
        const da = a.createdAt || a.date || "";
        const db = b.createdAt || b.date || "";
        return db.localeCompare(da);
      });

    if (records.length === 0) {
      historyList.innerHTML = `
        <div class="flex flex-col items-center justify-center
                    text-center text-slate-500
                    mt-24 space-y-3">

          <div class="text-base font-medium text-slate-600">
            No attendance records
          </div>

          <div class="text-sm max-w-xs">
            Tap the <span class="font-semibold text-slate-700">+</span> button
            to add your first attendance entry.
          </div>

        </div>
      `;
      return;
    }

    records.forEach(rec => {
      const card = document.createElement("div");

      card.className = `
        bg-white rounded-2xl p-4
        shadow-md active:scale-[0.99]
        transition cursor-pointer
      `;

      card.innerHTML = `
        <!-- HEADER -->
        <div class="flex items-start justify-between mb-3">
          <div class="text-sm font-semibold text-slate-800">
            ${rec.date}
            <span class="font-normal text-slate-400 mx-1">|</span>
            <span class="font-normal text-slate-500">
              Shift ${rec.shift}
            </span>
          </div>
          <div class="flex items-center gap-3">
            <!-- COPY ICON -->
            <button
              class="copy-btn p-1 rounded-md
                    hover:bg-slate-100
                    active:scale-95 transition"
              data-id="${rec.id}"
              title="Copy report">

              <svg xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  class="w-4 h-4 text-slate-500">
                <rect x="9" y="9" width="13" height="13" rx="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4
                        a2 2 0 0 1 2-2h9
                        a2 2 0 0 1 2 2v1"></path>
              </svg>
            </button>
          </div>
        </div>


        <!-- OFFICER -->
        <div class="text-sm text-slate-600 mb-3">
          Officer
          <span class="font-medium text-slate-800">
            ${rec.officerName}
          </span>
        </div>

        <!-- COUNTS -->
        <div class="flex gap-2 mb-3">
          <div class="flex-1 text-center
                      py-1 rounded-lg
                      bg-emerald-100 text-emerald-700
                      text-xs font-semibold">
            Present<br>${rec.counts.present}
          </div>

          <div class="flex-1 text-center
                      py-1 rounded-lg
                      bg-rose-100 text-rose-700
                      text-xs font-semibold">
            Absent<br>${rec.counts.absent}
          </div>
        </div>

        <!-- FOOTER -->
        <div class="flex justify-between items-center">
          <span class="text-xs text-slate-400">
            Tap to view / edit
          </span>

          <button
            class="text-xs font-medium text-rose-600"
            data-id="${rec.id}">
            Delete
          </button>
        </div>
      `;

      card.addEventListener("click", async (e) => {

        /* COPY REPORT */
        const copyBtn = e.target.closest(".copy-btn");
        if (copyBtn) {
          e.stopPropagation();

          const reportText = buildAttendanceReport(rec);

          try {
            await navigator.clipboard.writeText(reportText);

            // lightweight feedback
            copyBtn.classList.add("bg-emerald-100");
            setTimeout(() => {
              copyBtn.classList.remove("bg-emerald-100");
            }, 800);

          } catch (err) {
            alert("Failed to copy report");
          }

          return;
        }

        /* DELETE */
        if (e.target.matches("button[data-id]")) {

          if (e.target.matches("button[data-id]")) {
            e.stopPropagation();

            pendingDeleteId = rec.id;
            deletePasswordInput.value = "";
            deleteModal.classList.remove("hidden");

            return;
          }

          return;
        }

        /* EDIT */
        location.href = `entry.html?id=${rec.id}`;
      });

      historyList.appendChild(card);
    });
  }


  cancelDeleteBtn.onclick = () => {
    pendingDeleteId = null;
    deleteModal.classList.add("hidden");
  };

  confirmDeleteBtn.onclick = () => {
    const pwd = deletePasswordInput.value;

    if (pwd !== "12345") {
      alert("Incorrect password");
      return;
    }

    deleteAttendance(pendingDeleteId);
    pendingDeleteId = null;

    deleteModal.classList.add("hidden");
    render();
  };


  /* ---------- ADD NEW ---------- */
  addBtn.addEventListener("click", () => {
    location.href = "entry.html";
  });

  render();
});
