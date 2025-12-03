import type { Chess, PieceSymbol, Square } from "chess.js";
import type { EngineScore, NormalizedEvaluation } from "../types/engine";

const MATE_AS_CP = 32000;

export function normalizeScoreForWhite(score: EngineScore | null, fen: string): NormalizedEvaluation {
  if (!score) return null;
  const turn = fen.split(" ")[1];
  const multiplier = turn === "w" ? 1 : -1;
  if (score.type === "cp") {
    return { type: "cp", value: score.value * multiplier };
  }
  return { type: "mate", value: score.value * multiplier };
}

export function scoreToCentipawns(score: NormalizedEvaluation): number | null {
  if (!score) return null;
  if (score.type === "cp") return score.value;
  if (score.value === 0) return 0;
  return (score.value > 0 ? 1 : -1) * (MATE_AS_CP - Math.min(Math.abs(score.value), 100) * 100);
}

export function scoreDifferenceInCentipawns(
  before: NormalizedEvaluation,
  after: NormalizedEvaluation,
): number | null {
  const beforeCp = scoreToCentipawns(before);
  const afterCp = scoreToCentipawns(after);
  if (beforeCp === null || afterCp === null) return null;
  return afterCp - beforeCp;
}

export function formatEvalLabel(score: NormalizedEvaluation): string {
  if (!score) return "—";
  if (score.type === "mate") {
    const prefix = score.value > 0 ? "#" : "-#";
    return `${prefix}${Math.abs(score.value)}`;
  }
  const pawns = score.value / 100;
  return `${pawns >= 0 ? "+" : ""}${pawns.toFixed(2)}`;
}

export function describeGameOutcome(game: Chess): string {
  if (game.isCheckmate()) {
    const winner = game.turn() === "w" ? "Black" : "White";
    return `${winner} wins by checkmate.`;
  }
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isInsufficientMaterial()) return "Draw: insufficient material.";
  if (game.isThreefoldRepetition()) return "Draw by repetition.";
  if (game.isDrawByFiftyMoves()) return "Draw by 50-move rule.";
  if (game.isDraw()) return "Draw.";
  return "Game over.";
}

export function uciToMoveDescriptor(uci: string): { from: Square; to: Square; promotion?: PieceSymbol } | null {
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(uci)) {
    return null;
  }
  const from = uci.slice(0, 2) as Square;
  const to = uci.slice(2, 4) as Square;
  const promotion = uci.length === 5 ? (uci[4] as PieceSymbol) : undefined;
  return { from, to, promotion };
}
