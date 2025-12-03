import type { Move } from "chess.js";

type Props = {
  moves: Move[];
};

type Row = {
  moveNumber: number;
  white?: string;
  black?: string;
};

export function MoveList({ moves }: Props) {
  const rows: Row[] = [];

  for (let index = 0; index < moves.length; index += 2) {
    rows.push({
      moveNumber: index / 2 + 1,
      white: moves[index]?.san,
      black: moves[index + 1]?.san,
    });
  }

  return (
    <div className="move-list">
      <div className="move-list-header">
        <span>#</span>
        <span>White</span>
        <span>Black</span>
      </div>
      <div className="move-list-body">
        {rows.map((row) => (
          <div className="move-row" key={row.moveNumber}>
            <span>{row.moveNumber}.</span>
            <span>{row.white ?? ""}</span>
            <span>{row.black ?? ""}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
