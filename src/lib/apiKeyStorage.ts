const STORAGE_KEY = "chesscoach_openai_api_key";

function setLocal(value: string | null) {
  if (typeof localStorage === "undefined") return;
  if (value === null) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, value);
  }
}

function getLocal() {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(STORAGE_KEY);
}

export async function saveApiKey(value: string) {
  setLocal(value.trim());
}

export async function loadApiKey() {
  return getLocal();
}

export async function clearApiKey() {
  setLocal(null);
}
