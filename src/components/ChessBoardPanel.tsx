import type { Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import "./ChessBoardPanel.css";

type Props = {
  fen: string;
  allowMoves: boolean;
  onPieceDrop: (source: Square, target: Square) => boolean;
  statusText: string;
  gameResult: string | null;
};

export function ChessBoardPanel({ fen, allowMoves, onPieceDrop, statusText, gameResult }: Props) {
  return (
    <div className="board-panel">
      <div className="status-chip">{statusText}</div>
      <div className="board-wrapper">
        <Chessboard
          options={{
            id: "player-board",
            position: fen,
            boardOrientation: "white",
            animationDurationInMs: 300,
            allowDragging: allowMoves,
            boardStyle: {
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
              width: "100%",
              maxWidth: "520px",
              margin: "0 auto",
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => {
              if (!targetSquare) return false;
              return onPieceDrop(sourceSquare as Square, targetSquare as Square);
            },
          }}
        />
      </div>
      {gameResult && <div className="game-result">{gameResult}</div>}
    </div>
  );
}
