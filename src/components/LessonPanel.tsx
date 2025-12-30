import type { CoachLessonState, LessonScenario } from "../types/coaching";

type Props = {
  state: CoachLessonState;
  onGenerate: () => void;
  insightsAvailable: boolean;
  disabled?: boolean;
  onStartScenario?: (scenario: LessonScenario) => void;
};

export function LessonPanel({ state, onGenerate, insightsAvailable, disabled, onStartScenario }: Props) {
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
      {state.status === "ready" && state.payload && (() => {
        const { title, overview, estimatedImpact } = state.payload;
        const focusPrinciples = state.payload.focusPrinciples ?? [];
        const drills = state.payload.drills ?? [];
        const checkpoints = state.payload.checkpoints ?? [];
        const scenarios = state.payload.scenarios ?? [];
        return (
          <div className="lesson-body">
            <h3>{title}</h3>
            <p>{overview}</p>
            {focusPrinciples.length > 0 && (
            <div>
              <h4>Focus principles</h4>
              <div className="principle-tags">
                {focusPrinciples.map((id) => (
                  <span key={id} className="principle-tag">
                    {id}
                  </span>
                ))}
              </div>
            </div>
            )}
            {drills.length > 0 && (
            <div>
              <h4>Drills</h4>
              <ul>
                {drills.map((drill) => (
                  <li key={drill}>{drill}</li>
                ))}
              </ul>
            </div>
            )}
            {checkpoints.length > 0 && (
            <div>
              <h4>Game checkpoints</h4>
              <ul>
                {checkpoints.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
            )}
            <p className="muted">Why this matters: {estimatedImpact}</p>
            {scenarios.length > 0 && (
            <div className="lesson-scenarios">
              <h4>Interactive drills</h4>
              <ul>
                {scenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <div>
                      <strong>{scenario.title}</strong>
                      <p className="muted small">{scenario.objective}</p>
                    </div>
                    <button
                      className="secondary-btn"
                      onClick={() => onStartScenario?.(scenario)}
                      disabled={!onStartScenario}
                    >
                      Start drill
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            )}
          </div>
        );
      })()}
      {state.status === "idle" && insightsAvailable && <p className="muted">Tap "Generate lesson" to get a 15-minute study plan.</p>}
    </div>
  );
}
