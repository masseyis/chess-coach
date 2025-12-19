import type { ChangeEvent } from "react";

type Props = {
  difficultyId: string;
  difficultyOptions: Array<{ id: string; label: string }>;
  onDifficultyChange: (difficultyId: string) => void;
  onNewGame: () => void;
  disableNewGame?: boolean;
  engineStatus: "booting" | "ready" | "error";
  onUndo: () => void;
  disableUndo?: boolean;
  onRetire: () => void;
  disableRetire?: boolean;
};
export function Controls({ difficultyId, difficultyOptions, onDifficultyChange, onNewGame, disableNewGame, engineStatus, onUndo, disableUndo, onRetire, disableRetire }: Props) {
  const handleDepthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onDifficultyChange(event.target.value);
  };

  const statusLabel =
    engineStatus === "ready" ? "Engine ready" : engineStatus === "error" ? "Engine error" : "Engine loading";

  return (
    <div className="controls-panel">
      <label className="select-label">
        Engine depth
        <select value={difficultyId} onChange={handleDepthChange} className="control-select" disabled={engineStatus !== "ready"}>
          {difficultyOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="control-hint">Higher depth = stronger but slower engine (rough Elo shown).</span>
      </label>
      <button className="primary-btn" onClick={onNewGame} disabled={disableNewGame}>
        New Game
      </button>
      <button className="secondary-btn" onClick={onUndo} disabled={disableUndo}>
        Undo move
      </button>
      <button className="danger-btn" onClick={onRetire} disabled={disableRetire}>
        Retire
      </button>
      <span className={`engine-status engine-status-${engineStatus}`}>{statusLabel}</span>
    </div>
  );
}
