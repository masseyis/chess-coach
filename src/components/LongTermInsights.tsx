import type { CoachInsightEntry, CoachingPrincipleId } from "../types/coaching";
import { COACHING_PRINCIPLES } from "../lib/coachingPrompt";

type Props = {
  history: CoachInsightEntry[];
};

const RECENT_WINDOW = 5;

export function LongTermInsights({ history }: Props) {
  return (
    <div className="long-term-insights">
      <div className="panel-label">Long-term coaching</div>
      {history.length === 0 ? (
        <p className="muted">Finish a couple of full games to unlock trends and recurring themes.</p>
      ) : (
        <InsightsBody history={history} />
      )}
    </div>
  );
}

function InsightsBody({ history }: { history: CoachInsightEntry[] }) {
  const latest = history[history.length - 1];
  const latestElo = typeof latest.estimatedElo === "number" ? latest.estimatedElo : null;
  const previousElo = getPreviousEstimatedElo(history);
  const eloDelta = latestElo !== null && previousElo !== null ? latestElo - previousElo : null;
  const principleLeaders = getPrincipleLeaders(history);
  const practiceHighlights = getPracticeIdeaLeaders(history);
  const { sampleSize, averages } = getGradeAverages(history);
  const eloSeries = getEloSeries(history);

  return (
    <div>
      <section>
        <h4>Rating progress</h4>
        {latestElo === null ? (
          <p className="muted">Need one more summary with a rating estimate to chart progress.</p>
        ) : (
          <p>
            Latest estimate: ~{Math.round(latestElo)} Elo{" "}
            {eloDelta !== null && Math.abs(eloDelta) >= 1 && (
              <span className={eloDelta >= 0 ? "trend-up" : "trend-down"}>
                ({formatDelta(eloDelta)} vs. last game)
              </span>
            )}
          </p>
        )}
        {eloSeries.length >= 2 && <Sparkline values={eloSeries} />}
        <p className="muted">Tracking {history.length} completed {history.length === 1 ? "game" : "games"}.</p>
      </section>

      <section>
        <h4>Recurring themes</h4>
        {principleLeaders.length === 0 ? (
          <p className="muted">No repeated principle flags yet. Keep reviewing the basics.</p>
        ) : (
          <ul>
            {principleLeaders.map(([id, count]) => (
              <li key={id}>
                <strong>{principleLabel(id)}</strong> — flagged {count} {count === 1 ? "time" : "times"}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4>Practice themes</h4>
        {practiceHighlights.length === 0 ? (
          <p className="muted">Still waiting for repeat practice items. Keep finishing games.</p>
        ) : (
          <ul className="practice-ideas-list">
            {practiceHighlights.map(([idea, count]) => (
              <li key={idea}>
                <strong>{idea}</strong>
                <span>{count} {count === 1 ? "time" : "times"}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h4>Recent mistake mix</h4>
        {sampleSize === 0 ? (
          <p className="muted">Play more games to spot mistake patterns.</p>
        ) : (
          <ul>
            <li>Mistakes per game (last {sampleSize}): {formatAverage(averages.mistake)}</li>
            <li>Blunders per game (last {sampleSize}): {formatAverage(averages.blunder)}</li>
          </ul>
        )}
      </section>
    </div>
  );
}

function getPreviousEstimatedElo(history: CoachInsightEntry[]) {
  for (let i = history.length - 2; i >= 0; i -= 1) {
    const entry = history[i];
    if (typeof entry.estimatedElo === "number") {
      return entry.estimatedElo;
    }
  }
  return null;
}

function getPrincipleLeaders(history: CoachInsightEntry[]): Array<[CoachingPrincipleId, number]> {
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
    .slice(0, 3);
}

function getPracticeIdeaLeaders(history: CoachInsightEntry[]): Array<[string, number]> {
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
    .slice(0, 3);
}

function getGradeAverages(history: CoachInsightEntry[]) {
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

function principleLabel(id: CoachingPrincipleId) {
  return COACHING_PRINCIPLES[id]?.label ?? id;
}

function formatDelta(value: number) {
  const rounded = Math.round(value);
  return `${value > 0 ? "+" : ""}${rounded}`;
}

function formatAverage(value: number) {
  return value.toFixed(1);
}

function getEloSeries(history: CoachInsightEntry[]) {
  return history
    .map((entry) => entry.estimatedElo)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="elo-sparkline" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={points} />
    </svg>
  );
}
