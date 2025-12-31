import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Move, PieceSymbol, Square } from "chess.js";
import { ChessBoardPanel } from "./components/ChessBoardPanel";
import { Controls } from "./components/Controls";
import { EvaluationPanel } from "./components/EvaluationPanel";
import { MoveList } from "./components/MoveList";
import { ApiKeyManager } from "./components/ApiKeyManager";
import { GameSummaryCard } from "./components/GameSummary";
import { StockfishService } from "./engine/stockfishService";
import type { EngineEvaluation, NormalizedEvaluation } from "./types/engine";
import type {
  CoachInsightEntry,
  CoachLessonRequest,
  CoachLessonState,
  CoachingHistoryEntry,
  CoachingPanelState,
  CoachingResponse,
  GameSummaryResponse,
  GameSummaryState,
  LessonScenario,
} from "./types/coaching";
import { getCoachLesson, getGameSummary, getMoveCoaching } from "./lib/openaiClient";
import {
  describeGameOutcome,
  formatEvalLabel,
  normalizeScoreForWhite,
  scoreDifferenceInCentipawns,
  scoreToCentipawns,
  uciToMoveDescriptor,
} from "./lib/chessHelpers";
import {
  buildRecentFeedbackMemory,
  summarizeCoachingHistory,
  tallyGradeOccurrences,
  tallyPrincipleOccurrences,
} from "./lib/coachingHistory";
import { clearApiKey, loadApiKey, saveApiKey } from "./lib/apiKeyStorage";
import { clearGameState, loadGameState, saveGameState } from "./lib/gameStorage";
import { DEFAULT_DIFFICULTY_ID, ENGINE_DIFFICULTIES, findDifficultyById, findLegacyDepthDifficulty, type ImperfectionProfile } from "./lib/engineDifficulty";
import { loadCoachInsights, saveCoachInsights } from "./lib/coachInsightsStorage";
import { loadCoachLesson, saveCoachLesson } from "./lib/lessonStorage";
import { LongTermInsights } from "./components/LongTermInsights";
import { LessonPanel } from "./components/LessonPanel";
import {
  getGradeAverages,
  getLatestEstimatedElo,
  getPracticeIdeaLeaders,
  getPreviousEstimatedElo,
  getPrincipleLeaders,
} from "./lib/coachInsightsSummary";
import "./App.css";

const DEPTH_STORAGE_KEY = "chesscoach_engine_depth";
const DEFAULT_DIFFICULTY = findDifficultyById(DEFAULT_DIFFICULTY_ID) ?? ENGINE_DIFFICULTIES[0];

type MoveDescriptor = {
  from: Square;
  to: Square;
  promotion?: PieceSymbol;
};

function movesMatchDescriptor(move: Move, descriptor: MoveDescriptor) {
  const promotion = (move.promotion ?? undefined) as PieceSymbol | undefined;
  return move.from === descriptor.from && move.to === descriptor.to && promotion === descriptor.promotion;
}

function moveToDescriptor(move: Move): MoveDescriptor {
  return {
    from: move.from as Square,
    to: move.to as Square,
    promotion: (move.promotion ?? undefined) as PieceSymbol | undefined,
  };
}

function randomChoice<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function pickMoveForDifficulty(game: Chess, bestMove: string | null, profile?: ImperfectionProfile | null): MoveDescriptor | null {
  const legalMoves = game.moves({ verbose: true }) as Move[];
  if (legalMoves.length === 0) return null;

  const bestDescriptor = bestMove ? uciToMoveDescriptor(bestMove) : null;
  if (!bestDescriptor) {
    return moveToDescriptor(randomChoice(legalMoves));
  }

  if (!profile) {
    return bestDescriptor;
  }

  const alternativeMoves = legalMoves.filter((move) => !movesMatchDescriptor(move, bestDescriptor));
  if (alternativeMoves.length === 0) {
    return bestDescriptor;
  }

  const quietAlternatives = alternativeMoves.filter((move) => !move.flags.includes("c") && !move.san.includes("+"));
  const forcingAlternatives = alternativeMoves.filter((move) => move.flags.includes("c") || move.san.includes("+"));
  const buckets = [
    { moves: quietAlternatives, weight: profile.quiet },
    { moves: forcingAlternatives, weight: profile.forcing },
    { moves: alternativeMoves, weight: profile.random },
  ].filter((bucket) => bucket.moves.length > 0 && bucket.weight > 0);

  const bestWeight = bestDescriptor ? Math.max(0, profile.best) : 0;
  const totalWeight = buckets.reduce((sum, bucket) => sum + bucket.weight, 0) + bestWeight;

  if (totalWeight <= 0) {
    return bestDescriptor;
  }

  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (const bucket of buckets) {
    cumulative += bucket.weight;
    if (roll < cumulative) {
      return moveToDescriptor(randomChoice(bucket.moves));
    }
  }

  return bestDescriptor;
}

type EngineStatus = "booting" | "ready" | "error";

export default function App() {
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishService | null>(null);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<Move[]>(chessRef.current.history({ verbose: true }));
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("booting");
  const [engineMessage, setEngineMessage] = useState<string>("Starting Stockfish...");
  const [difficultyId, setDifficultyId] = useState(DEFAULT_DIFFICULTY.id);
  const selectedDifficulty = useMemo(
    () => findDifficultyById(difficultyId) ?? DEFAULT_DIFFICULTY,
    [difficultyId],
  );
  const engineDepth = selectedDifficulty.engineDepth;
  const [currentEval, setCurrentEval] = useState<NormalizedEvaluation | null>(null);
  const [coachingState, setCoachingState] = useState<CoachingPanelState>({ status: "idle" });
  const [lastFeedback, setLastFeedback] = useState<CoachingResponse | null>(null);
  const [coachingHistory, setCoachingHistory] = useState<CoachingHistoryEntry[]>([]);
  const [summaryState, setSummaryState] = useState<GameSummaryState>({ status: "idle" });
  const [apiKey, setApiKey] = useState<string | null>(import.meta.env.VITE_OPENAI_API_KEY ?? null);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [lastHumanMove, setLastHumanMove] = useState<Move | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Waiting for Stockfish...");
  const [coachInsights, setCoachInsights] = useState<CoachInsightEntry[]>([]);
  const [lessonState, setLessonState] = useState<CoachLessonState>({ status: "idle" });
  const [trainingSession, setTrainingSession] = useState<{
    scenario: LessonScenario;
    chess: Chess;
    fen: string;
    stepIndex: number;
    feedback: string | null;
    status: "active" | "complete";
  } | null>(null);
  const aggregateElo = useMemo(() => {
    const entries = coachInsights.filter((entry) => typeof entry.estimatedElo === "number");
    if (entries.length === 0) return null;
    const total = entries.reduce((sum, entry) => sum + (entry.estimatedElo ?? 0), 0);
    return { average: total / entries.length, count: entries.length };
  }, [coachInsights]);

  const lessonContext = useMemo<CoachLessonRequest | null>(() => {
    if (coachInsights.length === 0) return null;
    const ratingEstimate = getLatestEstimatedElo(coachInsights);
    const previous = getPreviousEstimatedElo(coachInsights);
    const ratingTrend = ratingEstimate !== null && previous !== null ? ratingEstimate - previous : null;
    const principleHotspots = getPrincipleLeaders(coachInsights).map(([id, count]) => ({ id, count }));
    const recurringPracticeIdeas = getPracticeIdeaLeaders(coachInsights).map(([idea, count]) => ({ idea, count }));
    const { sampleSize, averages } = getGradeAverages(coachInsights);
    const mistakeRates = {
      sampleSize,
      mistakesPerGame: averages.mistake,
      blundersPerGame: averages.blunder,
    };
    const recentResults = coachInsights
      .slice(-5)
      .map((entry) => entry.result)
      .filter((result): result is string => typeof result === "string" && result.length > 0);
    const recentMoveHighlights = coachingHistory.slice(-5).map((entry) => ({
      move: entry.moveSan,
      grade: entry.response.grade,
      note: entry.response.shortLabel,
    }));

    return {
      ratingEstimate,
      ratingTrend,
      totalGamesTracked: coachInsights.length,
      principleHotspots,
      recurringPracticeIdeas,
      mistakeRates,
      recentResults,
      recentMoveHighlights,
    };
  }, [coachInsights, coachingHistory]);

  useEffect(() => {
    const service = new StockfishService();
    engineRef.current = service;

    const unsubscribe = service.subscribe((event) => {
      if (event.type === "ready") {
        setEngineStatus("ready");
        setEngineMessage("Stockfish ready. Let's play!");
        setStatusText("Your move as White.");
      }
      if (event.type === "error") {
        setEngineStatus("error");
        setEngineMessage(event.message ?? "Engine error");
        setStatusText(event.message ?? "Engine error");
      }
    });

    return () => {
      unsubscribe();
      service.dispose();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadApiKey()
      .then((stored) => {
        if (cancelled) return;
        if (stored) {
          setApiKey(stored);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setApiKeyReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const syncGameState = useCallback(() => {
    const game = chessRef.current;
    const currentFen = game.fen();
    const verboseHistory = game.history({ verbose: true });
    setFen(currentFen);
    setMoves(verboseHistory);

    let resultText: string | null = null;
    if (game.isGameOver()) {
      resultText = describeGameOutcome(game);
      setGameResult(resultText);
      setStatusText(resultText);
    } else {
      setGameResult(null);
    }

    saveGameState({ movesSAN: game.history(), fen: currentFen, gameResult: resultText });
  }, []);

  useEffect(() => {
    const saved = loadGameState();
    if (saved && saved.movesSAN.length > 0) {
      const game = chessRef.current;
      game.reset();
      for (const san of saved.movesSAN) {
        try {
          game.move(san, { sloppy: true } as any);
        } catch (error) {
          console.warn("Failed to replay saved move", san, error);
          break;
        }
      }
      syncGameState();
      if (saved.gameResult) {
        setStatusText(saved.gameResult);
      } else {
        setStatusText("Game restored. Your move.");
      }
    }
  }, [syncGameState]);

  useEffect(() => {
    try {
      const savedDepth = localStorage.getItem(DEPTH_STORAGE_KEY);
      if (!savedDepth) return;

      const matchedById = findDifficultyById(savedDepth);
      if (matchedById) {
        setDifficultyId(matchedById.id);
        return;
      }

      const parsed = Number(savedDepth);
      if (!Number.isNaN(parsed)) {
        const legacy = findLegacyDepthDifficulty(parsed);
        if (legacy) {
          setDifficultyId(legacy.id);
        }
      }
    } catch (error) {
      console.warn("Unable to read depth preference", error);
    }
  }, []);

  useEffect(() => {
    setCoachInsights(loadCoachInsights());
  }, []);

  useEffect(() => {
    const savedLesson = loadCoachLesson();
    if (savedLesson) {
      setLessonState({ status: "ready", payload: savedLesson });
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(DEPTH_STORAGE_KEY, selectedDifficulty.id);
    } catch (error) {
      console.warn("Unable to persist depth preference", error);
    }
    if (engineStatus === "ready") {
      engineRef.current?.configure({ skillLevel: selectedDifficulty.skillLevel });
    }
  }, [selectedDifficulty, engineStatus]);

  const lastSummaryRef = useRef<string | null>(null);
  const lastInsightSummaryRef = useRef<string | null>(null);

  useEffect(() => {
    if (!gameResult) {
      lastInsightSummaryRef.current = null;
    }
  }, [gameResult]);

  const recordCoachInsight = useCallback(
    (summary: GameSummaryResponse, summaryKey: string | null) => {
      if (!gameResult || !summaryKey) return;
      if (lastInsightSummaryRef.current === summaryKey) return;

      const principleTally = tallyPrincipleOccurrences(coachingHistory);
      const gradeTally = tallyGradeOccurrences(coachingHistory);

      const entry: CoachInsightEntry = {
        id: `${Date.now()}`,
        completedAt: new Date().toISOString(),
        result: gameResult,
        estimatedElo: Number.isFinite(summary.estimatedElo) ? summary.estimatedElo : null,
        practiceIdeas: summary.practiceIdeas ?? [],
        principleTally,
        gradeTally,
      };

      setCoachInsights((prev) => {
        const next = [...prev, entry].slice(-30);
        saveCoachInsights(next);
        return next;
      });

      lastInsightSummaryRef.current = summaryKey;
    },
    [coachingHistory, gameResult],
  );

  const handleGenerateLesson = useCallback(async () => {
    if (!lessonContext) {
      setLessonState({ status: "error", message: "Finish at least one summarized game to unlock lessons." });
      return;
    }
    if (!apiKey) {
      setLessonState({ status: "error", message: "Add your OpenAI API key to request a lesson." });
      return;
    }

    setLessonState({ status: "loading" });
    try {
      const lesson = await getCoachLesson(lessonContext, apiKey);
      setLessonState({ status: "ready", payload: lesson });
      saveCoachLesson(lesson);
    } catch (error) {
      console.error(error);
      setLessonState({ status: "error", message: "Lesson unavailable (API error)." });
    }
  }, [apiKey, lessonContext]);

  const handleTrainingDrop = useCallback(
    (source: Square, target: Square) => {
      let moveAccepted = false;
      setTrainingSession((prev) => {
        if (!prev || prev.status === "complete") return prev;
        const move = prev.chess.move({ from: source, to: target, promotion: "q" });
        if (!move) {
          return prev;
        }
        const expected = prev.scenario.solution[prev.stepIndex];
        if (expected && move.san === expected.move) {
          const nextIndex = prev.stepIndex + 1;
          const finished = nextIndex >= prev.scenario.solution.length;
          moveAccepted = true;
          return {
            ...prev,
            stepIndex: nextIndex,
            feedback: expected.explanation,
            status: finished ? "complete" : "active",
            fen: prev.chess.fen(),
          };
        }

        prev.chess.undo();
        moveAccepted = false;
        return {
          ...prev,
          feedback: prev.scenario.fallbackHint || "Not quite — revisit the key idea.",
        };
      });
      return moveAccepted;
    },
    [],
  );

  useEffect(() => {
    if (!gameResult) {
      setSummaryState({ status: "idle" });
      lastSummaryRef.current = null;
      return;
    }
    if (!apiKey) {
      setSummaryState({ status: "error", message: "Add your API key to get a game summary." });
      return;
    }
    const pgn = chessRef.current.pgn();
    if (!pgn || lastSummaryRef.current === pgn) return;
    setSummaryState({ status: "loading" });
    lastSummaryRef.current = pgn;
    const highlights = coachingHistory.slice(-6).map((entry) => `${entry.moveSan}: ${entry.response.shortLabel}`);

    getGameSummary(
      {
        pgn,
        highlights,
        result: gameResult,
      },
      apiKey,
    )
      .then((summary) => {
    setSummaryState({ status: "ready", payload: summary });
        recordCoachInsight(summary, pgn);
      })
      .catch((error) => {
        console.error(error);
        setSummaryState({ status: "error", message: "Summary unavailable (API error)." });
      });
  }, [apiKey, coachingHistory, gameResult, recordCoachInsight]);

  const canPlayerMove = engineStatus === "ready" && !isProcessing && !gameResult;
  const canUndo = moves.length > 0 && !isProcessing;
  const canRetire = !isProcessing && !gameResult;

  const handleNewGame = useCallback(() => {
    const game = chessRef.current;
    game.reset();
    setFen(game.fen());
    setMoves(game.history({ verbose: true }));
    setCurrentEval(null);
    setCoachingState({ status: "idle" });
    setLastFeedback(null);
    setCoachingHistory([]);
    setLastHumanMove(null);
    setGameResult(null);
    setStatusText(engineStatus === "ready" ? "Game reset. Your move as White." : "Waiting for Stockfish...");
    clearGameState();
    lastSummaryRef.current = null;
    lastInsightSummaryRef.current = null;
  }, [engineStatus]);

  const handleStartScenario = useCallback((scenario: LessonScenario) => {
    try {
      const trainingChess = new Chess();
      trainingChess.load(scenario.fen);
      if (trainingChess.turn() !== (scenario.sideToMove ?? "white").charAt(0)) {
        // Ensure side to move matches FEN; no-op if mismatch.
      }
      setTrainingSession({
        scenario,
        chess: trainingChess,
        fen: trainingChess.fen(),
        stepIndex: 0,
        feedback: null,
        status: "active",
      });
    } catch (error) {
      console.warn("Unable to start scenario", error);
      setLessonState({ status: "error", message: "Scenario FEN invalid." });
    }
  }, []);

  const exitTrainingScenario = useCallback(() => {
    setTrainingSession(null);
  }, []);

  const handleSaveApiKey = useCallback(async (value: string) => {
    await saveApiKey(value);
    setApiKey(value);
  }, []);

  const handleClearApiKey = useCallback(async () => {
    await clearApiKey();
    setApiKey(null);
  }, []);

  const handleRetire = useCallback(() => {
    if (gameResult) return;
    const game = chessRef.current;
    const resultText = "You retired from this game.";
    setGameResult(resultText);
    setStatusText(resultText);
    setSummaryState({ status: "idle" });
    saveGameState({ movesSAN: game.history(), fen: game.fen(), gameResult: resultText });
  }, [gameResult]);

  const handleUndo = useCallback(() => {
    if (isProcessing) return;
    const game = chessRef.current;
    if (game.history().length === 0) return;

    if (game.turn() === "b") {
      const undone = game.undo();
      if (!undone) return;
    } else {
      const removedEngineMove = game.undo();
      if (!removedEngineMove) return;
      const removedPlayerMove = game.undo();
      if (!removedPlayerMove) return;
    }

    setCoachingHistory((prev) => {
      const next = prev.slice(0, -1);
      const lastEntry = next[next.length - 1];
      if (lastEntry) {
        setCoachingState({ status: "ready", payload: lastEntry.response, moveSan: lastEntry.moveSan, scoreChange: null });
        setLastFeedback(lastEntry.response);
      } else {
        setCoachingState({ status: "idle" });
        setLastFeedback(null);
      }
      return next;
    });

    setLastHumanMove(null);
    setCurrentEval(null);
    setStatusText("Move undone. Your turn.");
    setGameResult(null);
    syncGameState();
  }, [isProcessing, syncGameState]);

  const makeEngineMove = useCallback(
    async (bestMove?: string) => {
      if (chessRef.current.isGameOver()) {
        syncGameState();
        return;
      }

      const moveDescriptor = pickMoveForDifficulty(
        chessRef.current,
        bestMove ?? null,
        selectedDifficulty.imperfectionProfile,
      );
      if (!moveDescriptor) {
        setStatusText("Engine has no legal reply. Your move.");
        syncGameState();
        return;
      }

      const move = chessRef.current.move(moveDescriptor);
      if (!move) {
        console.warn("Engine suggested illegal move", bestMove);
        syncGameState();
        return;
      }

      syncGameState();
      setStatusText(chessRef.current.isGameOver() ? describeGameOutcome(chessRef.current) : "Your turn.");
    },
    [selectedDifficulty, syncGameState],
  );

  const handleEvaluationResults = useCallback(
    async ({ before, after, move }: { before: EngineEvaluation; after: EngineEvaluation; move: Move }) => {
      const fenBefore = before.fen;
      const fenAfter = after.fen;

      const normalizedBefore = normalizeScoreForWhite(before.score, fenBefore);
      const normalizedAfter = normalizeScoreForWhite(after.score, fenAfter);
      setCurrentEval(normalizedAfter ?? null);

      const scoreChange = scoreDifferenceInCentipawns(normalizedBefore, normalizedAfter);

      if (apiKey) {
        const recentMoves = chessRef.current
          .history({ verbose: true })
          .map((entry) => entry.san)
          .slice(-10);
        const recentFeedbackMemory = buildRecentFeedbackMemory(coachingHistory, 4);
        const playerContextSummary = summarizeCoachingHistory(coachingHistory);

        try {
          const convertEval = (value: NormalizedEvaluation | null) => {
            const numeric = scoreToCentipawns(value);
            if (numeric === null) return "unknown";
            return numeric;
          };

          const coaching = await getMoveCoaching({
            positionFenBefore: fenBefore,
            positionFenAfter: fenAfter,
            movePlayed: move.san,
            engineEvalBefore: convertEval(normalizedBefore),
            engineEvalAfter: convertEval(normalizedAfter),
            engineBestMoveBefore: before.bestMove ?? "unknown",
            engineBestMoveAfter: after.bestMove ?? "unknown",
            recentMoves,
            recentFeedback: recentFeedbackMemory,
            playerContextSummary,
          }, apiKey);

          setLastFeedback(coaching);
          setCoachingState({ status: "ready", payload: coaching, moveSan: move.san, scoreChange });
          setCoachingHistory((prev) => {
            const next = [...prev, { moveSan: move.san, response: coaching }];
            return next.slice(-12);
          });
          setStatusText("Coach feedback ready. Waiting for Black...");
        } catch (error) {
          console.error(error);
          setCoachingState({ status: "error", message: "Coaching unavailable (API error)." });
          setStatusText("Coaching unavailable this move.");
        }
      } else {
        setCoachingState({
          status: "error",
          message: "Add your OpenAI API key to enable coaching feedback.",
        });
        setStatusText("Waiting for your API key...");
      }

      await makeEngineMove(after.bestMove ?? undefined);
    },
    [apiKey, coachingHistory, makeEngineMove],
  );

  const evaluateAndCoach = useCallback(
    async ({ move, fenBefore, fenAfter }: { move: Move; fenBefore: string; fenAfter: string }) => {
      if (!engineRef.current) return;

      setIsProcessing(true);
      setCoachingState({ status: "loading" });
      setLastHumanMove(move);
      setStatusText("Analyzing your move...");

      try {
        const before = await engineRef.current.evaluatePosition(fenBefore, { depth: engineDepth });
        const after = await engineRef.current.evaluatePosition(fenAfter, { depth: engineDepth });
        await handleEvaluationResults({ before, after, move });
      } catch (error) {
        console.error(error);
        setCoachingState({ status: "error", message: "Engine evaluation failed. Try again." });
        setStatusText("Engine evaluation failed.");
      } finally {
        setIsProcessing(false);
      }
    },
    [engineDepth, handleEvaluationResults],
  );

  const onPieceDrop = useCallback(
    (source: Square, target: Square) => {
      if (!canPlayerMove) return false;

      const game = chessRef.current;
      const fenBefore = game.fen();
      const move = game.move({ from: source, to: target, promotion: "q" });

      if (!move) {
        return false;
      }

      const fenAfter = game.fen();
      syncGameState();
      evaluateAndCoach({ move, fenBefore, fenAfter });

      return true;
    },
    [canPlayerMove, evaluateAndCoach, syncGameState],
  );

  const currentEvalLabel = useMemo(() => formatEvalLabel(currentEval), [currentEval]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>Chess Coach</h1>
          <p className="subtitle">Play vs. Stockfish and get feedback after every move.</p>
          <p className="support-note">
            If this helps your chess, consider supporting me on <a href="https://ko-fi.com/masseyis" target="_blank" rel="noreferrer">Ko-fi</a> ☕️
          </p>
        </div>
        <Controls
          difficultyId={selectedDifficulty.id}
          difficultyOptions={ENGINE_DIFFICULTIES}
          onDifficultyChange={setDifficultyId}
          onNewGame={handleNewGame}
          disableNewGame={isProcessing}
          engineStatus={engineStatus}
          onUndo={handleUndo}
          disableUndo={!canUndo}
          onRetire={handleRetire}
          disableRetire={!canRetire}
        />
      </header>

      <ApiKeyManager
        apiKey={apiKey}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
        loading={!apiKeyReady}
      />

      <div className="board-layout">
        <div className="board-section">
          <ChessBoardPanel
            fen={fen}
            allowMoves={canPlayerMove}
            onPieceDrop={onPieceDrop}
            statusText={statusText}
            gameResult={gameResult}
          />
        </div>

        <div className="evaluation-section">
          <EvaluationPanel
            engineStatus={engineStatus}
            engineMessage={engineMessage}
            evaluationLabel={currentEvalLabel}
            coachingState={coachingState}
            previousFeedback={lastFeedback}
            lastMoveSan={lastHumanMove?.san ?? null}
          />
        </div>

        <div className="move-section">
          <MoveList moves={moves} />
        </div>

        <div className="summary-section">
          <GameSummaryCard state={summaryState} gameResult={gameResult} aggregateEstimate={aggregateElo} />
        </div>

        <div className="insights-section">
          <LongTermInsights history={coachInsights} />
        </div>

        <div className="lesson-section">
          <LessonPanel
            state={lessonState}
            onGenerate={handleGenerateLesson}
            insightsAvailable={Boolean(lessonContext)}
            disabled={isProcessing}
            onStartScenario={handleStartScenario}
          />
        </div>

        {trainingSession && (
          <div className="training-section">
            <div className="training-panel">
              <div className="panel-header">
                <div>
                  <div className="panel-label">Drill: {trainingSession.scenario.title}</div>
                  <p className="muted small">{trainingSession.scenario.objective}</p>
                </div>
                <div className="training-actions">
                  <button className="secondary-btn" onClick={() => handleStartScenario(trainingSession.scenario)}>
                    Restart
                  </button>
                  <button className="danger-btn" onClick={exitTrainingScenario}>
                    Exit
                  </button>
                </div>
              </div>
              <ChessBoardPanel
                fen={trainingSession.fen}
                allowMoves={trainingSession.status !== "complete"}
                onPieceDrop={handleTrainingDrop}
                statusText={trainingSession.status === "complete" ? "Drill complete!" : "Play the idea."}
                gameResult={trainingSession.status === "complete" ? "Success" : null}
              />
              {trainingSession.feedback && <p className="muted">Feedback: {trainingSession.feedback}</p>}
              {trainingSession.status === "complete" && <p className="muted">Great job! Try the next scenario or restart to reinforce.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
