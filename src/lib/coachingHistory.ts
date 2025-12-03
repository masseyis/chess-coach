import type { CoachingHistoryEntry, CoachingMemoryItem } from "../types/coaching";

const GRADE_ORDER = ["great", "good", "inaccurate", "mistake", "blunder"] as const;

export function summarizeCoachingHistory(history: CoachingHistoryEntry[]): string {
  if (history.length === 0) {
    return "No prior feedback yet. Encourage experimentation and highlight any solid fundamentals you notice.";
  }

  const gradeCounts: Record<string, number> = Object.fromEntries(GRADE_ORDER.map((grade) => [grade, 0]));
  const principleCounts = new Map<string, number>();

  history.forEach((entry) => {
    gradeCounts[entry.response.grade] = (gradeCounts[entry.response.grade] || 0) + 1;
    entry.response.principles.forEach((principle) => {
      principleCounts.set(principle, (principleCounts.get(principle) ?? 0) + 1);
    });
  });

  const gradeSummary = GRADE_ORDER.map((grade) => `${grade}: ${gradeCounts[grade] ?? 0}`).join(", ");
  const topPrinciples = Array.from(principleCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([principle, count]) => `${principle} (${count})`)
    .join(", ");

  let highlight = "Recent highlight: celebrate any confident moves that followed the plan.";
  for (let i = history.length - 1; i >= 0; i -= 1) {
    const entry = history[i];
    if (entry.response.grade === "great" || entry.response.grade === "good") {
      highlight = `Recent highlight: move ${entry.moveSan} — ${entry.response.shortLabel}.`;
      break;
    }
  }

  const themesLine = topPrinciples ? `Frequent themes: ${topPrinciples}.` : "No repeating themes yet — keep reinforcing core principles.";

  return `Grades (${history.length} moves): ${gradeSummary}. ${themesLine} ${highlight}`;
}

export function buildRecentFeedbackMemory(
  history: CoachingHistoryEntry[],
  limit = 3,
): CoachingMemoryItem[] {
  return history.slice(-limit).map((entry) => ({
    move: entry.moveSan,
    grade: entry.response.grade,
    shortLabel: entry.response.shortLabel,
    principles: entry.response.principles,
  }));
}
