const HISTORY_KEY = "OFFICER_ATTENDANCE_HISTORY";

/* ---------- LOAD ---------- */
export function loadHistory() {
  return JSON.parse(localStorage.getItem(HISTORY_KEY)) || {};
}

/* ---------- SAVE RAW ---------- */
export function saveHistory(history) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

/* ---------- SAVE / UPDATE ATTENDANCE ---------- */
export function saveAttendance(record) {
  const history = loadHistory();

  // ✅ Generate ID for new records
  const id = record.id || crypto.randomUUID();

  history[id] = {
    ...record,
    id,
    createdAt: history[id]?.createdAt || new Date().toISOString(),
    edited: Boolean(record.id)
  };

  saveHistory(history);
}

/* ---------- GET SINGLE ---------- */
export function getAttendance(id) {
  return loadHistory()[id];
}

/* ---------- DELETE ---------- */
export function deleteAttendance(id) {
  const history = loadHistory();
  delete history[id];
  saveHistory(history);
}
