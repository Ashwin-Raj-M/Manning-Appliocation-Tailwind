
const KEY = "MANNING_TOKEN_DATA";

export function saveTokens(data) {
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadTokens() {
  return JSON.parse(localStorage.getItem(KEY)) || {};
}
