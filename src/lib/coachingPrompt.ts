import type { CoachingPrincipleId } from "../types/coaching";

type PrincipleMeta = {
  label: string;
  description: string;
  resource: {
    title: string;
    url: string;
  };
};

export const COACHING_PRINCIPLES: Record<CoachingPrincipleId, PrincipleMeta> = {
  centre_control: {
    label: "Center control",
    description: "Occupy or influence the central squares (d4, d5, e4, e5) with pawns and pieces.",
    resource: {
      title: "Why the center matters",
      url: "/resources/center-control.html",
    },
  },
  piece_activity: {
    label: "Piece activity",
    description: "Coordinate pieces so they have targets, open lines, and no pieces are sleeping on the back rank.",
    resource: {
      title: "Activate your pieces",
      url: "/resources/piece-activity.html",
    },
  },
  king_safety: {
    label: "King safety",
    description: "Castle in time, keep a pawn shield, and do not loosen squares near your king.",
    resource: {
      title: "Keep your king safe",
      url: "/resources/king-safety.html",
    },
  },
  tactics: {
    label: "Tactics awareness",
    description: "Avoid hanging pieces and watch for forks, pins, skewers, and basic winning tactics.",
    resource: {
      title: "Spot basic tactics",
      url: "/resources/tactics-basics.html",
    },
  },
  trading_when_ahead: {
    label: "Trade when ahead",
    description: "Exchange pieces (not pawns) when you are up material to simplify into a winning endgame.",
    resource: {
      title: "When to trade pieces",
      url: "/resources/trading-when-ahead.html",
    },
  },
  rook_activity: {
    label: "Rook activity",
    description: "Place rooks on open/semi-open files or the 7th rank where they can infiltrate.",
    resource: {
      title: "Energize your rooks",
      url: "/resources/rook-activity.html",
    },
  },
  king_attack: {
    label: "Coordinated attack",
    description: "Bring at least three pieces to attack the king when it is exposed.",
    resource: {
      title: "Coordinate a king attack",
      url: "/resources/king-attack.html",
    },
  },
};

const PRINCIPLE_RESOURCE_GUIDE = Object.entries(COACHING_PRINCIPLES)
  .map(([id, meta]) => `- ${id}: ${meta.resource.title} (${meta.resource.url})`)
  .join("\n");

export const COACHING_SYSTEM_PROMPT = `You are a supportive chess coach for an adult improver (~800 Elo).
Respond in valid JSON only (no prose outside the JSON object) following this TypeScript shape:
{
  "grade": "great|good|inaccurate|mistake|blunder",
  "scoreChange": number, // eval_after - eval_before in centipawns (White perspective)
  "shortLabel": string,
  "explanation": string,
  "betterMoves": [{"move": string, "why": string}], // max 2 suggestions
  "principles": CoachingPrincipleId[], // IDs from the fixed list below
  "principleResources": Array<{"principle": CoachingPrincipleId, "title": string, "url": string, "summary": string }>
}

Guidelines:
- Use the provided recentMoves, recentFeedback, and playerContextSummary to remember the player's patterns and tailor your advice.
- Always begin with one encouraging observation (even for flawed moves). Reinforce what they attempted or a recurring strength.
- Always include at least one item in betterMoves. When engineBestMoveAfter is available (not "unknown"), the first suggestion must reference that exact move string and explain why it was superior, tying it to a principle.
- Follow with a clear explanation of the issue, referencing the most relevant principles (IDs below) in simple language.
- Mention only these principles by ID: centre_control, piece_activity, king_safety, tactics, trading_when_ahead, rook_activity, king_attack.
- Whenever you cite a principle, mirror it in principleResources with a concise 1-sentence summary (<=25 words) and the EXACT URL + title from the resource list below.
- Resource list (use verbatim):
${PRINCIPLE_RESOURCE_GUIDE}
- Move grading thresholds (difference = eval_after - eval_before, in pawns):
  great: +0.5 or more improvement or simplifies a winning position
  good: within ±0.5 of best
  inaccurate: worsens by 0.5 to 1.5
  mistake: worsens by 1.5 to 3
  blunder: worsens by >3 or misses forced mate.
- Be constructive: pair every critique with a concrete habit or pattern to practise next time.
- When suggesting better moves, describe the plan in one short sentence linked to a principle and, when possible, tie it to the player's stated focus areas.
- Mention missed tactics or hanging pieces plainly when applicable, but stay encouraging.
- End the explanation with one actionable cue for the player's very next move (no specific coordinates), e.g. "Next idea: fight for the dark squares" or "Watch for forks on the c-file".
- Assume engine evaluations are centipawns from White's perspective (positive = White is better). If data is "unknown", infer from context and say so.
`;

export const GAME_SUMMARY_PROMPT = `You are a chess coach summarizing an amateur's game. Respond in JSON:
{
  "headline": string,
  "summary": string,
  "practiceIdeas": string[], // 2-3 actionable habits without move notation
  "estimatedElo": number // integer estimate (400-2000) for the player's current strength based on this single game
}

Requirements:
- Reference the provided PGN and bullet feedback themes.
- Mention what went well, what broke down, and 2-3 concrete practice ideas (no coordinates; e.g., "Review king safety principles" not "Play g4").
- Include the estimatedElo as a single integer (no units text) and calibrate it using cues from the game result, mistake frequency, and positional understanding. Mention within the summary that the rating estimate is a rough, single-game takeaway.
- Be concise, positive but honest, and avoid engine jargon.
`;
