import type { CoachLessonState } from "../types/coaching";

type Props = {
  state: CoachLessonState;
  onGenerate: () => void;
  insightsAvailable: boolean;
  disabled?: boolean;
};

export function LessonPanel({ state, onGenerate, insightsAvailable, disabled }: Props) {
  const isLoading = state.status === "loading";
  const handleClick = () => {
    if (disabled || isLoading) return;
    onGenerate();
  };

  return (
    <div className="lesson-panel">
      <div className="panel-header">
        <div>
          <div className="panel-label">Custom lesson</div>
          <p className="muted small">AI-tailored drills based on your last games.</p>
        </div>
        <button className="primary-btn" onClick={handleClick} disabled={disabled || isLoading || !insightsAvailable}>
          {isLoading ? "Generating..." : "Generate lesson"}
        </button>
      </div>
      {!insightsAvailable && <p className="muted">Finish a summarized game first so the coach knows your patterns.</p>}
      {state.status === "error" && <p className="error-text">{state.message}</p>}
      {state.status === "ready" && (
        <div className="lesson-body">
          <h3>{state.payload.title}</h3>
          <p>{state.payload.overview}</p>
          {state.payload.focusPrinciples.length > 0 && (
            <div>
              <h4>Focus principles</h4>
              <div className="principle-tags">
                {state.payload.focusPrinciples.map((id) => (
                  <span key={id} className="principle-tag">
                    {id}
                  </span>
                ))}
              </div>
            </div>
          )}
          {state.payload.drills.length > 0 && (
            <div>
              <h4>Drills</h4>
              <ul>
                {state.payload.drills.map((drill) => (
                  <li key={drill}>{drill}</li>
                ))}
              </ul>
            </div>
          )}
          {state.payload.checkpoints.length > 0 && (
            <div>
              <h4>Game checkpoints</h4>
              <ul>
                {state.payload.checkpoints.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="muted">Why this matters: {state.payload.estimatedImpact}</p>
        </div>
      )}
      {state.status === "idle" && insightsAvailable && <p className="muted">Tap "Generate lesson" to get a 15-minute study plan.</p>}
    </div>
  );
}
