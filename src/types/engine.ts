export type EngineScore = { type: "cp"; value: number } | { type: "mate"; value: number };

export type NormalizedEvaluation = EngineScore | null;

export type EngineEvaluation = {
  fen: string;
  depth: number;
  score: EngineScore | null;
  bestMove: string | null;
};

export type StockfishEvent =
  | { type: "ready" }
  | {
      type: "error";
      message?: string;
    };
