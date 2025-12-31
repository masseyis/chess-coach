import type { GameSummaryState } from "../types/coaching";

type Props = {
  state: GameSummaryState;
  gameResult: string | null;
  aggregateEstimate?: { average: number; count: number } | null;
};

export function GameSummaryCard({ state, gameResult, aggregateEstimate }: Props) {
  if (!gameResult) return null;

  return (
    <div className="game-summary-card">
      <div className="panel-label">Coach summary</div>
      {state.status === "idle" && <p className="muted">Finish a game to unlock a personalized recap.</p>}
      {state.status === "loading" && <p className="muted">Summarizing your game...</p>}
      {state.status === "error" && <p className="error-text">{state.message}</p>}
      {state.status === "ready" && (
        <div>
          <h3>{state.payload.headline}</h3>
          {renderEstimate(state.payload.estimatedElo, aggregateEstimate)}
          <p>{state.payload.summary}</p>
          <h4>Practice next</h4>
          <ul>
            {state.payload.practiceIdeas.map((idea) => (
              <li key={idea}>{idea}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function renderEstimate(latest: number | undefined, aggregate?: { average: number; count: number } | null) {
  if (aggregate && Number.isFinite(aggregate.average)) {
    return (
      <p className="muted">
        Estimated rating (avg of {aggregate.count} games): ~{Math.round(aggregate.average)} Elo
        {typeof latest === "number" && Number.isFinite(latest) ? ` (last game ~${Math.round(latest)})` : ""}
      </p>
    );
  }

  if (typeof latest === "number" && Number.isFinite(latest)) {
    return <p className="muted">Estimated rating from this game: ~{Math.round(latest)} Elo</p>;
  }

  return null;
}
