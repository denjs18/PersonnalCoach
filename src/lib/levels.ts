import { CATEGORIES, type CategoryKey } from "./constants";

/**
 * Système de progression : niveaux, rangs par famille d'exercices et
 * accomplissements.
 *
 * Tout est **dérivé** des séances et séries déjà enregistrées, à chaque
 * affichage. Rien n'est stocké : aucune table, aucune écriture, aucun risque
 * pour les données existantes — et les séances déjà faites comptent
 * rétroactivement.
 */

/* -------------------------------------------------------------------------- */
/*  Les données dont dépend toute la progression                              */
/* -------------------------------------------------------------------------- */

export type ProgressionStats = {
  sessions: number;
  totalSets: number;
  totalVolumeKg: number;
  totalCalories: number;
  totalMinutes: number;
  /** Semaines consécutives avec au moins une séance, aujourd'hui. */
  weekStreak: number;
  /** La plus longue série de semaines jamais tenue. */
  bestWeekStreak: number;
  setsByCategory: Record<string, number>;
  distinctExercises: number;
  duoSessions: number;
  longestSessionMinutes: number;
  /** Séances où toutes les séries prévues ont été validées. */
  perfectSessions: number;
  /** Meilleur nombre de séances sur une même semaine. */
  bestWeekSessions: number;
};

export const EMPTY_STATS: ProgressionStats = {
  sessions: 0,
  totalSets: 0,
  totalVolumeKg: 0,
  totalCalories: 0,
  totalMinutes: 0,
  weekStreak: 0,
  bestWeekStreak: 0,
  setsByCategory: {},
  distinctExercises: 0,
  duoSessions: 0,
  longestSessionMinutes: 0,
  perfectSessions: 0,
  bestWeekSessions: 0,
};

/* -------------------------------------------------------------------------- */
/*  Points d'expérience                                                       */
/* -------------------------------------------------------------------------- */

export type SessionXp = {
  total: number;
  parts: Array<{ label: string; points: number }>;
};

/**
 * Ce que rapporte une séance. Le gros des points vient du fait de l'avoir
 * faite : on récompense la régularité avant la performance.
 */
export function sessionXp(input: {
  loggedSets: number;
  plannedSets: number;
  calories: number | null;
  volumeKg: number;
}): SessionXp {
  const parts: Array<{ label: string; points: number }> = [
    { label: "Séance terminée", points: 100 },
  ];

  if (input.loggedSets > 0) {
    parts.push({ label: `${input.loggedSets} séries validées`, points: input.loggedSets * 10 });
  }

  const effort = input.calories ?? Math.round(input.volumeKg / 50);
  if (effort > 0) {
    parts.push({ label: "Effort fourni", points: Math.round(effort / 10) });
  }

  if (input.plannedSets > 0 && input.loggedSets >= input.plannedSets) {
    parts.push({ label: "Séance complète, rien laissé de côté", points: 50 });
  }

  return { total: parts.reduce((acc, p) => acc + p.points, 0), parts };
}

/* -------------------------------------------------------------------------- */
/*  Niveaux                                                                    */
/* -------------------------------------------------------------------------- */

export type Level = { level: number; title: string; xp: number; emoji: string };

/** Les premiers niveaux arrivent vite : c'est au début qu'on a besoin d'élan. */
export const LEVELS: Level[] = [
  { level: 1, title: "Premiers pas", xp: 0, emoji: "🌱" },
  { level: 2, title: "Motivée", xp: 350, emoji: "✨" },
  { level: 3, title: "Régulière", xp: 900, emoji: "🔥" },
  { level: 4, title: "Assidue", xp: 1800, emoji: "💫" },
  { level: 5, title: "Solide", xp: 3200, emoji: "💪" },
  { level: 6, title: "Aguerrie", xp: 5000, emoji: "⚡" },
  { level: 7, title: "Endurante", xp: 7500, emoji: "🌊" },
  { level: 8, title: "Redoutable", xp: 10500, emoji: "🌟" },
  { level: 9, title: "Athlète", xp: 14000, emoji: "🏅" },
  { level: 10, title: "Guerrière", xp: 18500, emoji: "🛡️" },
  { level: 11, title: "Inarrêtable", xp: 24000, emoji: "🚀" },
  { level: 12, title: "Légende", xp: 31000, emoji: "👑" },
];

export type LevelProgress = {
  current: Level;
  next: Level | null;
  xp: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  ratio: number;
};

export function levelFromXp(xp: number): LevelProgress {
  let current = LEVELS[0];
  for (const level of LEVELS) if (xp >= level.xp) current = level;

  const next = LEVELS.find((l) => l.level === current.level + 1) ?? null;
  const xpIntoLevel = xp - current.xp;
  const xpForNextLevel = next ? next.xp - current.xp : 0;

  return {
    current,
    next,
    xp,
    xpIntoLevel,
    xpForNextLevel,
    ratio: next ? Math.min(1, xpIntoLevel / xpForNextLevel) : 1,
  };
}

/* -------------------------------------------------------------------------- */
/*  Rangs par famille d'exercices                                             */
/* -------------------------------------------------------------------------- */

/** Paliers en nombre de séries réalisées dans la famille. */
export const CATEGORY_RANKS = [
  { rank: 0, title: "À découvrir", sets: 0 },
  { rank: 1, title: "Novice", sets: 10 },
  { rank: 2, title: "Initiée", sets: 30 },
  { rank: 3, title: "Confirmée", sets: 75 },
  { rank: 4, title: "Experte", sets: 150 },
  { rank: 5, title: "Maîtresse", sets: 300 },
];

export type CategoryProgress = {
  category: CategoryKey;
  label: string;
  emoji: string;
  color: string;
  sets: number;
  rank: number;
  title: string;
  nextAt: number | null;
  ratio: number;
};

export function categoryProgress(stats: ProgressionStats): CategoryProgress[] {
  return (Object.keys(CATEGORIES) as CategoryKey[])
    .map((category) => {
      const sets = stats.setsByCategory[category] ?? 0;
      let current = CATEGORY_RANKS[0];
      for (const r of CATEGORY_RANKS) if (sets >= r.sets) current = r;
      const next = CATEGORY_RANKS.find((r) => r.rank === current.rank + 1) ?? null;

      return {
        category,
        label: CATEGORIES[category].label,
        emoji: CATEGORIES[category].emoji,
        color: CATEGORIES[category].color,
        sets,
        rank: current.rank,
        title: current.title,
        nextAt: next?.sets ?? null,
        ratio: next ? Math.min(1, (sets - current.sets) / (next.sets - current.sets)) : 1,
      };
    })
    .sort((a, b) => b.sets - a.sets);
}

/* -------------------------------------------------------------------------- */
/*  Accomplissements                                                          */
/* -------------------------------------------------------------------------- */

export type BadgeFamily = "assiduite" | "effort" | "variete" | "endurance";

export const BADGE_FAMILIES: Record<BadgeFamily, { label: string; emoji: string }> = {
  assiduite: { label: "Régularité", emoji: "📆" },
  effort: { label: "Effort", emoji: "🔥" },
  variete: { label: "Variété", emoji: "🎨" },
  endurance: { label: "Endurance", emoji: "⏱️" },
};

export type Badge = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  family: BadgeFamily;
  /** Où en est-on, et à partir de quand c'est débloqué. */
  progress: (s: ProgressionStats) => { current: number; target: number };
};

const sessionsBadge = (id: string, n: number, title: string, emoji: string): Badge => ({
  id,
  title,
  description: `${n} séances terminées`,
  emoji,
  family: "assiduite",
  progress: (s) => ({ current: s.sessions, target: n }),
});

const streakBadge = (id: string, n: number, title: string, emoji: string): Badge => ({
  id,
  title,
  description: `${n} semaines d'affilée avec au moins une séance`,
  emoji,
  family: "assiduite",
  progress: (s) => ({ current: s.bestWeekStreak, target: n }),
});

export const BADGES: Badge[] = [
  /* --- Régularité --- */
  {
    id: "first",
    title: "C'est parti",
    description: "Ta première séance terminée",
    emoji: "🎉",
    family: "assiduite",
    progress: (s) => ({ current: s.sessions, target: 1 }),
  },
  sessionsBadge("s5", 5, "Ça devient une habitude", "🌿"),
  sessionsBadge("s10", 10, "Dizaine", "🔟"),
  sessionsBadge("s25", 25, "Vingt-cinq", "🧗"),
  sessionsBadge("s50", 50, "Cinquantaine", "🏔️"),
  sessionsBadge("s100", 100, "Centenaire", "💯"),
  streakBadge("k2", 2, "Deux semaines", "📈"),
  streakBadge("k4", 4, "Un mois sans lâcher", "🗓️"),
  streakBadge("k8", 8, "Deux mois", "🧱"),
  streakBadge("k12", 12, "Un trimestre", "🏛️"),
  {
    id: "week3",
    title: "Grosse semaine",
    description: "3 séances dans la même semaine",
    emoji: "🌶️",
    family: "assiduite",
    progress: (s) => ({ current: s.bestWeekSessions, target: 3 }),
  },
  {
    id: "perfect",
    title: "Sans rien laisser",
    description: "Une séance où toutes les séries prévues ont été validées",
    emoji: "✅",
    family: "assiduite",
    progress: (s) => ({ current: s.perfectSessions, target: 1 }),
  },
  {
    id: "perfect10",
    title: "Perfectionniste",
    description: "10 séances bouclées sans en laisser une seule",
    emoji: "🎯",
    family: "assiduite",
    progress: (s) => ({ current: s.perfectSessions, target: 10 }),
  },

  /* --- Effort --- */
  {
    id: "t1",
    title: "Une tonne",
    description: "1 000 kg soulevés au total",
    emoji: "🏋️",
    family: "effort",
    progress: (s) => ({ current: s.totalVolumeKg, target: 1000 }),
  },
  {
    id: "t10",
    title: "Dix tonnes",
    description: "10 000 kg soulevés au total",
    emoji: "🚛",
    family: "effort",
    progress: (s) => ({ current: s.totalVolumeKg, target: 10000 }),
  },
  {
    id: "t50",
    title: "Cinquante tonnes",
    description: "50 000 kg soulevés au total",
    emoji: "🐘",
    family: "effort",
    progress: (s) => ({ current: s.totalVolumeKg, target: 50000 }),
  },
  {
    id: "kcal1000",
    title: "Mille calories",
    description: "1 000 kcal dépensées à l'entraînement",
    emoji: "🔥",
    family: "effort",
    progress: (s) => ({ current: s.totalCalories, target: 1000 }),
  },
  {
    id: "kcal5000",
    title: "Cinq mille",
    description: "5 000 kcal dépensées à l'entraînement",
    emoji: "🌋",
    family: "effort",
    progress: (s) => ({ current: s.totalCalories, target: 5000 }),
  },
  {
    id: "kcal20000",
    title: "Vingt mille",
    description: "20 000 kcal dépensées à l'entraînement",
    emoji: "☄️",
    family: "effort",
    progress: (s) => ({ current: s.totalCalories, target: 20000 }),
  },
  {
    id: "sets500",
    title: "Cinq cents séries",
    description: "500 séries validées",
    emoji: "🧮",
    family: "effort",
    progress: (s) => ({ current: s.totalSets, target: 500 }),
  },

  /* --- Variété --- */
  {
    id: "ex20",
    title: "Curieuse",
    description: "20 exercices différents essayés",
    emoji: "🧭",
    family: "variete",
    progress: (s) => ({ current: s.distinctExercises, target: 20 }),
  },
  {
    id: "ex50",
    title: "Touche-à-tout",
    description: "50 exercices différents essayés",
    emoji: "🗺️",
    family: "variete",
    progress: (s) => ({ current: s.distinctExercises, target: 50 }),
  },
  {
    id: "allFamilies",
    title: "Tour complet",
    description: "Au moins une série dans chacune des 8 familles d'exercices",
    emoji: "🎨",
    family: "variete",
    progress: (s) => ({
      current: Object.values(s.setsByCategory).filter((n) => n > 0).length,
      target: Object.keys(CATEGORIES).length,
    }),
  },
  {
    id: "duo1",
    title: "À deux",
    description: "Une séance avec un exercice à deux",
    emoji: "🤝",
    family: "variete",
    progress: (s) => ({ current: s.duoSessions, target: 1 }),
  },
  {
    id: "duo10",
    title: "Équipe soudée",
    description: "10 séances avec des exercices à deux",
    emoji: "👯",
    family: "variete",
    progress: (s) => ({ current: s.duoSessions, target: 10 }),
  },

  /* --- Endurance --- */
  {
    id: "long60",
    title: "Une heure pleine",
    description: "Une séance de 60 minutes ou plus",
    emoji: "⏳",
    family: "endurance",
    progress: (s) => ({ current: s.longestSessionMinutes, target: 60 }),
  },
  {
    id: "long90",
    title: "Marathonienne",
    description: "Une séance de 90 minutes ou plus",
    emoji: "🕰️",
    family: "endurance",
    progress: (s) => ({ current: s.longestSessionMinutes, target: 90 }),
  },
  {
    id: "h10",
    title: "Dix heures",
    description: "10 heures d'entraînement cumulées",
    emoji: "🌙",
    family: "endurance",
    progress: (s) => ({ current: s.totalMinutes, target: 600 }),
  },
  {
    id: "h24",
    title: "Un jour entier",
    description: "24 heures d'entraînement cumulées",
    emoji: "🌞",
    family: "endurance",
    progress: (s) => ({ current: s.totalMinutes, target: 1440 }),
  },
];

export type BadgeState = Badge & {
  current: number;
  target: number;
  earned: boolean;
  ratio: number;
};

export function badgeStates(stats: ProgressionStats): BadgeState[] {
  return BADGES.map((badge) => {
    const { current, target } = badge.progress(stats);
    return {
      ...badge,
      current,
      target,
      earned: current >= target,
      ratio: target > 0 ? Math.min(1, current / target) : 0,
    };
  });
}

/** Ce qui vient d'être débloqué entre deux états : sert à féliciter en fin de séance. */
export function newlyEarned(before: ProgressionStats, after: ProgressionStats): BadgeState[] {
  const wasEarned = new Set(
    badgeStates(before)
      .filter((b) => b.earned)
      .map((b) => b.id),
  );
  return badgeStates(after).filter((b) => b.earned && !wasEarned.has(b.id));
}
