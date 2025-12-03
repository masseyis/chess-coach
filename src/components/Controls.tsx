import type { ChangeEvent } from "react";

type Props = {
  engineDepth: number;
  onDepthChange: (depth: number) => void;
  onNewGame: () => void;
  disableNewGame?: boolean;
  engineStatus: "booting" | "ready" | "error";
  onUndo: () => void;
  disableUndo?: boolean;
};

const DEPTH_OPTIONS = [
  { value: 6, label: "Casual (depth 6)" },
  { value: 10, label: "Trainer (depth 10)" },
  { value: 14, label: "Challenging (depth 14)" },
];

export function Controls({ engineDepth, onDepthChange, onNewGame, disableNewGame, engineStatus, onUndo, disableUndo }: Props) {
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
      </label>
      <button className="primary-btn" onClick={onNewGame} disabled={disableNewGame}>
        New Game
      </button>
      <button className="secondary-btn" onClick={onUndo} disabled={disableUndo}>
        Undo move
      </button>
      <span className={`engine-status engine-status-${engineStatus}`}>{statusLabel}</span>
    </div>
  );
}
