import type { ChangeEvent } from "react";

type Props = {
  engineDepth: number;
  onDepthChange: (depth: number) => void;
  onNewGame: () => void;
  disableNewGame?: boolean;
  engineStatus: "booting" | "ready" | "error";
  onUndo: () => void;
  disableUndo?: boolean;
  onRetire: () => void;
  disableRetire?: boolean;
};

const DEPTH_OPTIONS = [
  { value: 4, label: "Depth 4 · Learner (~500 Elo)" },
  { value: 6, label: "Depth 6 · Casual (~700 Elo)" },
  { value: 8, label: "Depth 8 · Club (~900 Elo)" },
  { value: 10, label: "Depth 10 · Trainer (~1100 Elo)" },
  { value: 12, label: "Depth 12 · Strong (~1300 Elo)" },
  { value: 14, label: "Depth 14 · Tough (~1500 Elo)" },
];

export function Controls({ engineDepth, onDepthChange, onNewGame, disableNewGame, engineStatus, onUndo, disableUndo, onRetire, disableRetire }: Props) {
  const handleDepthChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onDepthChange(Number(event.target.value));
  };

  const statusLabel =
    engineStatus === "ready" ? "Engine ready" : engineStatus === "error" ? "Engine error" : "Engine loading";

  return (
    <div className="controls-panel">
      <label className="select-label">
        Engine depth
        <select value={engineDepth} onChange={handleDepthChange} className="control-select" disabled={engineStatus !== "ready"}>
          {DEPTH_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
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
