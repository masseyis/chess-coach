export type PersistedGameState = {
  movesSAN: string[];
  fen: string;
  gameResult: string | null;
};

const STORAGE_KEY = "chesscoach_game_state";

export function saveGameState(state: PersistedGameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn("Unable to save game state", error);
  }
}

export function loadGameState(): PersistedGameState | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (!value) return null;
    return JSON.parse(value) as PersistedGameState;
  } catch (error) {
    console.warn("Unable to load game state", error);
    return null;
  }
}

export function clearGameState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn("Unable to clear game state", error);
  }
}
