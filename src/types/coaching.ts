export type CoachingPrincipleId =
  | "centre_control"
  | "piece_activity"
  | "king_safety"
  | "tactics"
  | "trading_when_ahead"
  | "rook_activity"
  | "king_attack";

export type CoachingGrade = "great" | "good" | "inaccurate" | "mistake" | "blunder";

export type CoachingMemoryItem = {
  move: string;
  grade: CoachingGrade;
  shortLabel: string;
  principles: CoachingPrincipleId[];
};

export type CoachingHistoryEntry = {
  moveSan: string;
  response: CoachingResponse;
};

export type CoachingRequest = {
  positionFenBefore: string;
  positionFenAfter: string;
  movePlayed: string;
  engineEvalBefore: number | string;
  engineEvalAfter: number | string;
  engineBestMoveBefore: string;
  engineBestMoveAfter: string;
  recentMoves: string[];
  recentFeedback: CoachingMemoryItem[];
  playerContextSummary: string;
};

export type CoachingResponse = {
  grade: CoachingGrade;
  scoreChange: number;
  shortLabel: string;
  explanation: string;
  betterMoves: Array<{
    move: string;
    why: string;
  }>;
  principles: CoachingPrincipleId[];
};

export type CoachingPanelState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: CoachingResponse; moveSan: string; scoreChange?: number | null };

export type GameSummaryResponse = {
  headline: string;
  summary: string;
  practiceIdeas: string[];
};

export type GameSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: GameSummaryResponse };
