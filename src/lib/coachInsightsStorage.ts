import type { CoachInsightEntry } from "../types/coaching";

const STORAGE_KEY = "chesscoach_coach_insights";
const MAX_TRACKED_GAMES = 30;

export function loadCoachInsights(): CoachInsightEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as CoachInsightEntry[];
  } catch (error) {
    console.warn("Unable to load coach insights", error);
    return [];
  }
}

export function saveCoachInsights(entries: CoachInsightEntry[]) {
  try {
    const trimmed = entries.slice(-MAX_TRACKED_GAMES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn("Unable to save coach insights", error);
  }
}
