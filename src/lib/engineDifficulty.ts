export type ImperfectionProfile = {
  quiet: number;
  forcing: number;
  random: number;
  best: number;
};

export type EngineDifficulty = {
  id: string;
  label: string;
  engineDepth: number;
  skillLevel: number;
  imperfectionProfile?: ImperfectionProfile | null;
};

export const ENGINE_DIFFICULTIES: EngineDifficulty[] = [
  {
    id: "depth-4-chaotic",
    label: "Depth 4 · Beginner (~450 Elo, chaotic blunders)",
    engineDepth: 4,
    skillLevel: 0,
    imperfectionProfile: { quiet: 0.55, forcing: 0.25, random: 0.15, best: 0.05 },
  },
  {
    id: "depth-5-imperfect-3",
    label: "Depth 5 · Imperfect III (~520 Elo, still wild)",
    engineDepth: 5,
    skillLevel: 2,
    imperfectionProfile: { quiet: 0.45, forcing: 0.2, random: 0.15, best: 0.2 },
  },
  {
    id: "depth-5-imperfect-2",
    label: "Depth 5 · Imperfect II (~570 Elo, shaky play)",
    engineDepth: 5,
    skillLevel: 3,
    imperfectionProfile: { quiet: 0.35, forcing: 0.2, random: 0.1, best: 0.35 },
  },
  {
    id: "depth-5-imperfect-1",
    label: "Depth 5 · Imperfect I (~650 Elo, occasional slips)",
    engineDepth: 5,
    skillLevel: 5,
    imperfectionProfile: { quiet: 0.18, forcing: 0.12, random: 0.03, best: 0.67 },
  },
  {
    id: "depth-6",
    label: "Depth 6 · Casual (~700 Elo)",
    engineDepth: 6,
    skillLevel: 5,
  },
  {
    id: "depth-8",
    label: "Depth 8 · Club (~900 Elo)",
    engineDepth: 8,
    skillLevel: 8,
  },
  {
    id: "depth-10",
    label: "Depth 10 · Trainer (~1100 Elo)",
    engineDepth: 10,
    skillLevel: 12,
  },
  {
    id: "depth-12",
    label: "Depth 12 · Strong (~1300 Elo)",
    engineDepth: 12,
    skillLevel: 16,
  },
  {
    id: "depth-14",
    label: "Depth 14 · Tough (~1500 Elo)",
    engineDepth: 14,
    skillLevel: 20,
  },
];

export const DEFAULT_DIFFICULTY_ID = "depth-8";

export function findDifficultyById(id: string) {
  return ENGINE_DIFFICULTIES.find((option) => option.id === id);
}

export function findLegacyDepthDifficulty(depth: number) {
  return ENGINE_DIFFICULTIES.find((option) => !option.imperfectionProfile && option.engineDepth === depth);
}
