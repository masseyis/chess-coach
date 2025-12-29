import type { CoachInsightEntry, CoachingPrincipleId } from "../types/coaching";

export function getLatestEstimatedElo(history: CoachInsightEntry[]): number | null {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const value = history[i].estimatedElo;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function getPreviousEstimatedElo(history: CoachInsightEntry[]): number | null {
  for (let i = history.length - 2; i >= 0; i -= 1) {
    const value = history[i].estimatedElo;
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function getEloSeries(history: CoachInsightEntry[]): number[] {
  return history
    .map((entry) => entry.estimatedElo)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

export function getPrincipleLeaders(
  history: CoachInsightEntry[],
  limit = 3,
): Array<[CoachingPrincipleId, number]> {
  const tally = new Map<CoachingPrincipleId, number>();
  history.forEach((entry) => {
    Object.entries(entry.principleTally ?? {}).forEach(([id, count]) => {
      if (!count) return;
      const principle = id as CoachingPrincipleId;
      tally.set(principle, (tally.get(principle) ?? 0) + count);
    });
  });

  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

export function getPracticeIdeaLeaders(history: CoachInsightEntry[], limit = 3): Array<[string, number]> {
  const tally = new Map<string, number>();
  history.forEach((entry) => {
    (entry.practiceIdeas ?? []).forEach((idea) => {
      const normalized = idea.trim();
      if (!normalized) return;
      tally.set(normalized, (tally.get(normalized) ?? 0) + 1);
    });
  });

  return Array.from(tally.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
}

const RECENT_WINDOW = 5;

export function getGradeAverages(history: CoachInsightEntry[]) {
  const recent = history.slice(-RECENT_WINDOW);
  const totals: Record<string, number> = {};
  recent.forEach((entry) => {
    Object.entries(entry.gradeTally ?? {}).forEach(([grade, count]) => {
      if (!count) return;
      totals[grade] = (totals[grade] ?? 0) + count;
    });
  });

  const sampleSize = recent.length;
  const averages = {
    mistake: sampleSize ? (totals.mistake ?? 0) / sampleSize : 0,
    blunder: sampleSize ? (totals.blunder ?? 0) / sampleSize : 0,
  };

  return { sampleSize, averages };
}
