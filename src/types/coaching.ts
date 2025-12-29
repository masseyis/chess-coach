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
  principleResources?: PrincipleResourceLink[];
};

export type PrincipleResourceLink = {
  principle: CoachingPrincipleId;
  title: string;
  url: string;
  summary: string;
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
  estimatedElo: number;
};

export type GameSummaryState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: GameSummaryResponse };

export type CoachInsightEntry = {
  id: string;
  completedAt: string;
  result: string;
  estimatedElo: number | null;
  practiceIdeas: string[];
  principleTally: Partial<Record<CoachingPrincipleId, number>>;
  gradeTally: Partial<Record<CoachingGrade, number>>;
};

export type CoachLessonRequest = {
  ratingEstimate: number | null;
  ratingTrend: number | null;
  totalGamesTracked: number;
  principleHotspots: Array<{ id: CoachingPrincipleId; count: number }>;
  recurringPracticeIdeas: Array<{ idea: string; count: number }>;
  mistakeRates: { sampleSize: number; mistakesPerGame: number; blundersPerGame: number };
  recentResults: string[];
  recentMoveHighlights: Array<{ move: string; grade: CoachingGrade; note: string }>;
};

export type LessonScenarioStep = {
  move: string;
  explanation: string;
};

export type LessonScenario = {
  id: string;
  title: string;
  fen: string;
  sideToMove: "white" | "black";
  objective: string;
  fallbackHint: string;
  solution: LessonScenarioStep[];
};

export type CoachLessonResponse = {
  title: string;
  overview: string;
  focusPrinciples: CoachingPrincipleId[];
  drills: string[];
  checkpoints: string[];
  estimatedImpact: string;
  scenarios: LessonScenario[];
};

export type CoachLessonState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; payload: CoachLessonResponse };
