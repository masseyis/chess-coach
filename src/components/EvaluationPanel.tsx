import type { CoachingPanelState, CoachingResponse, CoachingPrincipleId } from "../types/coaching";
import { COACHING_PRINCIPLES } from "../lib/coachingPrompt";

const gradeLabels: Record<string, string> = {
  great: "Great",
  good: "Good",
  inaccurate: "Inaccurate",
  mistake: "Mistake",
  blunder: "Blunder",
};

type Props = {
  engineStatus: "booting" | "ready" | "error";
  engineMessage: string;
  evaluationLabel: string;
  coachingState: CoachingPanelState;
  previousFeedback: CoachingResponse | null;
  lastMoveSan: string | null;
};

export function EvaluationPanel({
  engineStatus,
  engineMessage,
  evaluationLabel,
  coachingState,
  previousFeedback,
  lastMoveSan,
}: Props) {
  const activeFeedback = coachingState.status === "ready" ? coachingState.payload : previousFeedback;
  const grade = activeFeedback?.grade ?? null;
  const scoreChange = coachingState.status === "ready" ? coachingState.scoreChange : null;

  return (
    <aside className="evaluation-panel">
      <div className="panel-card">
        <div className="panel-label">Engine evaluation (White)</div>
        <div className="eval-value">{evaluationLabel}</div>
        {engineStatus !== "ready" && <p className="engine-status-note">{engineMessage}</p>}
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <div>
            <p className="panel-label">Last move</p>
            <h2 className="panel-title">{lastMoveSan ?? "—"}</h2>
          </div>
          {grade && (
            <span className={`grade-chip grade-${grade}`}>
              {gradeLabels[grade] ?? grade}
            </span>
          )}
        </div>

        {renderCoachingBody(coachingState, activeFeedback, scoreChange)}
      </div>
    </aside>
  );
}

function renderCoachingBody(
  state: CoachingPanelState,
  feedback: CoachingResponse | null,
  scoreChange: number | null | undefined,
) {
  if (state.status === "idle") {
    return <p className="muted">Make your first move to receive tailored coaching.</p>;
  }

  if (state.status === "loading") {
    return (
      <div className="loader">
        <span className="spinner" aria-hidden />
        <p>Analyzing your move...</p>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="error-callout">
        <p>{state.message}</p>
        {feedback && renderFeedback(feedback, scoreChange)}
      </div>
    );
  }

  if (state.status === "ready" && feedback) {
    return renderFeedback(feedback, scoreChange);
  }

  if (feedback) {
    return renderFeedback(feedback, scoreChange);
  }

  return <p className="muted">No feedback yet.</p>;
}

function renderFeedback(feedback: CoachingResponse, scoreChange: number | null | undefined) {
  return (
    <div className="feedback-body">
      <p className="short-label">{feedback.shortLabel}</p>
      <p className="explanation">{feedback.explanation}</p>
      {typeof scoreChange === "number" && (
        <p className="score-change">
          Δ eval: {formatPawnDelta(scoreChange)}
        </p>
      )}
      {feedback.betterMoves.length > 0 && (
        <div className="better-moves">
          <h3>Try instead</h3>
          <ul>
            {feedback.betterMoves.map((move) => (
              <li key={move.move}>
                <strong>{move.move}</strong>
                <span>{move.why}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {feedback.principles.length > 0 && (
        <div className="principles">
          <h3>Principles</h3>
          <div className="principle-tags">
            {feedback.principles.map((principle) => (
              <span className="principle-tag" key={principle}>
                {principleLabel(principle)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function principleLabel(id: CoachingPrincipleId) {
  return COACHING_PRINCIPLES[id]?.label ?? id;
}

function formatPawnDelta(value: number) {
  const pawns = value / 100;
  const formatted = pawns.toFixed(2);
  return pawns > 0 ? `+${formatted}` : formatted;
}
