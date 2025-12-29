import type { CoachLessonResponse } from "../types/coaching";

const STORAGE_KEY = "chesscoach_last_lesson";

export function loadCoachLesson(): CoachLessonResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CoachLessonResponse;
  } catch (error) {
    console.warn("Unable to load saved lesson", error);
    return null;
  }
}

export function saveCoachLesson(lesson: CoachLessonResponse) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lesson));
  } catch (error) {
    console.warn("Unable to save lesson", error);
  }
}
