import type { GameSummaryState } from "../types/coaching";

type Props = {
  state: GameSummaryState;
  gameResult: string | null;
};

export function GameSummaryCard({ state, gameResult }: Props) {
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
