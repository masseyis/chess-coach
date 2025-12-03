import { Preferences } from "@capacitor/preferences";

const STORAGE_KEY = "chesscoach_openai_api_key";

async function writeToPreferences(value: string | null) {
  try {
    if (value === null) {
      await Preferences.remove({ key: STORAGE_KEY });
    } else {
      await Preferences.set({ key: STORAGE_KEY, value });
    }
  } catch (error) {
    console.warn("Preferences write failed, falling back to localStorage", error);
    if (typeof localStorage !== "undefined") {
      if (value === null) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, value);
      }
    }
  }
}

async function readFromPreferences(): Promise<string | null> {
  try {
    const result = await Preferences.get({ key: STORAGE_KEY });
    if (result.value) {
      return result.value;
    }
  } catch (error) {
    console.warn("Preferences read failed, falling back to localStorage", error);
  }

  if (typeof localStorage !== "undefined") {
    return localStorage.getItem(STORAGE_KEY);
  }

  return null;
}

export async function saveApiKey(value: string) {
  await writeToPreferences(value.trim());
}

export async function loadApiKey() {
  return readFromPreferences();
}

export async function clearApiKey() {
  await writeToPreferences(null);
}
