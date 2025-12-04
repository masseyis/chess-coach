import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import type { Move, Square } from "chess.js";
import { ChessBoardPanel } from "./components/ChessBoardPanel";
import { Controls } from "./components/Controls";
import { EvaluationPanel } from "./components/EvaluationPanel";
import { MoveList } from "./components/MoveList";
import { ApiKeyManager } from "./components/ApiKeyManager";
import { StockfishService } from "./engine/stockfishService";
import type { EngineEvaluation, NormalizedEvaluation } from "./types/engine";
import type {
  CoachingHistoryEntry,
  CoachingPanelState,
  CoachingResponse,
} from "./types/coaching";
import { getMoveCoaching } from "./lib/openaiClient";
import {
  describeGameOutcome,
  formatEvalLabel,
  normalizeScoreForWhite,
  scoreDifferenceInCentipawns,
  scoreToCentipawns,
  uciToMoveDescriptor,
} from "./lib/chessHelpers";
import { buildRecentFeedbackMemory, summarizeCoachingHistory } from "./lib/coachingHistory";
import { clearApiKey, loadApiKey, saveApiKey } from "./lib/apiKeyStorage";
import { clearGameState, loadGameState, saveGameState } from "./lib/gameStorage";
import "./App.css";

const DEFAULT_DEPTH = 8;

type EngineStatus = "booting" | "ready" | "error";

export default function App() {
  const chessRef = useRef(new Chess());
  const engineRef = useRef<StockfishService | null>(null);

  const [fen, setFen] = useState(chessRef.current.fen());
  const [moves, setMoves] = useState<Move[]>(chessRef.current.history({ verbose: true }));
  const [engineStatus, setEngineStatus] = useState<EngineStatus>("booting");
  const [engineMessage, setEngineMessage] = useState<string>("Starting Stockfish...");
  const [engineDepth, setEngineDepth] = useState(DEFAULT_DEPTH);
  const [currentEval, setCurrentEval] = useState<NormalizedEvaluation | null>(null);
  const [coachingState, setCoachingState] = useState<CoachingPanelState>({ status: "idle" });
  const [lastFeedback, setLastFeedback] = useState<CoachingResponse | null>(null);
  const [coachingHistory, setCoachingHistory] = useState<CoachingHistoryEntry[]>([]);
  const [apiKey, setApiKey] = useState<string | null>(import.meta.env.VITE_OPENAI_API_KEY ?? null);
  const [apiKeyReady, setApiKeyReady] = useState(false);
  const [lastHumanMove, setLastHumanMove] = useState<Move | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [statusText, setStatusText] = useState("Waiting for Stockfish...");

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

  const canPlayerMove = engineStatus === "ready" && !isProcessing && !gameResult;
  const canUndo = moves.length > 0 && !isProcessing;

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
  }, [engineStatus]);

  const handleSaveApiKey = useCallback(async (value: string) => {
    await saveApiKey(value);
    setApiKey(value);
  }, []);

  const handleClearApiKey = useCallback(async () => {
    await clearApiKey();
    setApiKey(null);
  }, []);

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

      if (!bestMove) {
        setStatusText("Engine has no legal reply. Your move.");
        syncGameState();
        return;
      }

      const moveDescriptor = uciToMoveDescriptor(bestMove);
      if (!moveDescriptor) {
        console.warn("Unable to parse engine move", bestMove);
        setStatusText("Engine response unavailable.");
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
    [syncGameState],
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
        </div>
        <Controls
          engineDepth={engineDepth}
          onDepthChange={setEngineDepth}
          onNewGame={handleNewGame}
          disableNewGame={isProcessing}
          engineStatus={engineStatus}
          onUndo={handleUndo}
          disableUndo={!canUndo}
        />
      </header>

      <ApiKeyManager
        apiKey={apiKey}
        onSave={handleSaveApiKey}
        onClear={handleClearApiKey}
        loading={!apiKeyReady}
      />

      <div className="board-layout">
        <div>
          <ChessBoardPanel
            fen={fen}
            allowMoves={canPlayerMove}
            onPieceDrop={onPieceDrop}
            statusText={statusText}
            gameResult={gameResult}
          />
          <MoveList moves={moves} />
        </div>

        <EvaluationPanel
          engineStatus={engineStatus}
          engineMessage={engineMessage}
          evaluationLabel={currentEvalLabel}
          coachingState={coachingState}
          previousFeedback={lastFeedback}
          lastMoveSan={lastHumanMove?.san ?? null}
        />
      </div>
    </div>
  );
}
