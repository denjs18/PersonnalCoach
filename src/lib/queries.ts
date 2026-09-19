import { cache } from "react";
import { and, asc, desc, eq, gte, ilike, inArray, isNotNull, lt, or, sql } from "drizzle-orm";
import { db, exercises, setLogs, settings, workoutItems, workouts } from "@/lib/db";
import type { Exercise, SetLog, Workout, WorkoutItem } from "@/lib/db";
import { startOfWeekISO, todayISO } from "@/lib/utils";
import {
  badgeStates,
  categoryProgress,
  levelFromXp,
  sessionXp,
  type BadgeState,
  type CategoryProgress,
  type LevelProgress,
  type ProgressionStats,
} from "@/lib/levels";
import {
  estimateCalories,
  isProfileComplete,
  readProfile,
  type EffortEntry,
} from "@/lib/effort";

export type ItemWithExercise = WorkoutItem & { exercise: Exercise };
export type FullWorkout = Workout & {
  items: ItemWithExercise[];
  logs: SetLog[];
};

/* ----------------------------- Bibliothèque ------------------------------ */

export async function listExercises(opts?: {
  search?: string;
  category?: string;
  equipment?: string;
  includeArchived?: boolean;
}): Promise<Exercise[]> {
  const filters = [];
  if (!opts?.includeArchived) filters.push(eq(exercises.isArchived, false));
  if (opts?.search?.trim()) {
    const q = `%${opts.search.trim()}%`;
    filters.push(or(ilike(exercises.name, q), ilike(exercises.description, q))!);
  }
  if (opts?.category) filters.push(eq(exercises.category, opts.category));
  if (opts?.equipment) {
    filters.push(sql`${opts.equipment} = ANY(${exercises.equipment})`);
  }

  return db
    .select()
    .from(exercises)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(exercises.isCustom), asc(exercises.name));
}

export async function getExercise(id: string): Promise<Exercise | null> {
  const [row] = await db.select().from(exercises).where(eq(exercises.id, id)).limit(1);
  return row ?? null;
}

/* -------------------------------- Séances -------------------------------- */

export async function getFullWorkout(id: string): Promise<FullWorkout | null> {
  const [workout] = await db.select().from(workouts).where(eq(workouts.id, id)).limit(1);
  if (!workout) return null;

  const rows = await db
    .select({ item: workoutItems, exercise: exercises })
    .from(workoutItems)
    .innerJoin(exercises, eq(exercises.id, workoutItems.exerciseId))
    .where(eq(workoutItems.workoutId, id))
    .orderBy(asc(workoutItems.position));

  const logs = await db
    .select()
    .from(setLogs)
    .where(eq(setLogs.workoutId, id))
    .orderBy(asc(setLogs.setNumber));

  return {
    ...workout,
    items: rows.map((r) => ({ ...r.item, exercise: r.exercise })),
    logs,
  };
}

export type WorkoutSummary = Workout & {
  exerciseCount: number;
  loggedSets: number;
  /** Estimation, null si le profil physique n'est pas renseigné. */
  calories: number | null;
};

/**
 * Reconstruit les séries réalisées d'un lot de séances sous la forme attendue
 * par le calcul d'effort. Permet d'estimer durée et calories pour n'importe
 * quelle séance, y compris celles terminées avant l'ajout de la fonction.
 */
export async function getWorkoutEffortEntries(workoutId: string): Promise<EffortEntry[]> {
  return (await effortEntriesByWorkout([workoutId])).get(workoutId) ?? [];
}

async function effortEntriesByWorkout(
  workoutIds: string[],
): Promise<Map<string, EffortEntry[]>> {
  const map = new Map<string, EffortEntry[]>();
  if (workoutIds.length === 0) return map;

  const rows = await db
    .select({
      workoutId: setLogs.workoutId,
      itemId: workoutItems.id,
      category: exercises.category,
      met: exercises.met,
      equipment: exercises.equipment,
      usesIncline: exercises.usesIncline,
      repSeconds: exercises.repSeconds,
      restSec: workoutItems.restSec,
      targetTimeSec: workoutItems.targetTimeSec,
      targetDistanceM: workoutItems.targetDistanceM,
      targetInclinePct: workoutItems.targetInclinePct,
      targetReps: workoutItems.targetReps,
      reps: setLogs.reps,
      weightKg: setLogs.weightKg,
      timeSec: setLogs.timeSec,
      distanceM: setLogs.distanceM,
      inclinePct: setLogs.inclinePct,
    })
    .from(setLogs)
    .innerJoin(workoutItems, eq(workoutItems.id, setLogs.workoutItemId))
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(and(inArray(setLogs.workoutId, workoutIds), eq(setLogs.done, true)))
    .orderBy(asc(workoutItems.position), asc(setLogs.setNumber));

  for (const row of rows) {
    const entry: EffortEntry = {
      item: {
        id: row.itemId,
        category: row.category,
        met: row.met,
        equipment: row.equipment,
        usesIncline: row.usesIncline,
        repSeconds: row.repSeconds,
        restSec: row.restSec,
        targetTimeSec: row.targetTimeSec,
        targetDistanceM: row.targetDistanceM,
        targetInclinePct: row.targetInclinePct,
        targetReps: row.targetReps,
      },
      set: {
        reps: row.reps,
        weightKg: row.weightKg,
        timeSec: row.timeSec,
        distanceM: row.distanceM,
        inclinePct: row.inclinePct,
        done: true,
      },
    };
    map.set(row.workoutId, [...(map.get(row.workoutId) ?? []), entry]);
  }
  return map;
}

async function summarize(list: Workout[]): Promise<WorkoutSummary[]> {
  if (list.length === 0) return [];
  const ids = list.map((w) => w.id);

  const counts = await db
    .select({ workoutId: workoutItems.workoutId, n: sql<number>`count(*)::int` })
    .from(workoutItems)
    .where(inArray(workoutItems.workoutId, ids))
    .groupBy(workoutItems.workoutId);

  const logged = await db
    .select({ workoutId: setLogs.workoutId, n: sql<number>`count(*)::int` })
    .from(setLogs)
    .where(and(inArray(setLogs.workoutId, ids), eq(setLogs.done, true)))
    .groupBy(setLogs.workoutId);

  const countMap = new Map(counts.map((c) => [c.workoutId, c.n]));
  const logMap = new Map(logged.map((c) => [c.workoutId, c.n]));

  // Inutile d'aller chercher les séries d'une liste qui n'en contient aucune
  // (séances à venir, brouillons…).
  const withLogs = [...logMap.keys()];
  const profile = readProfile(await getSettings());
  const effort =
    withLogs.length > 0 && isProfileComplete(profile)
      ? await effortEntriesByWorkout(withLogs)
      : new Map<string, EffortEntry[]>();

  return list.map((w) => {
    const entries = effort.get(w.id);
    return {
      ...w,
      exerciseCount: countMap.get(w.id) ?? 0,
      loggedSets: logMap.get(w.id) ?? 0,
      calories: entries
        ? estimateCalories(entries, profile, w.durationMinutes ? w.durationMinutes * 60 : null)
        : null,
    };
  });
}

/** Séances publiées et pas encore terminées, à partir d'aujourd'hui. */
export async function getUpcomingWorkouts(limit = 12): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.isTemplate, false),
        inArray(workouts.status, ["published"]),
        isNotNull(workouts.scheduledFor),
        gte(workouts.scheduledFor, todayISO()),
      ),
    )
    .orderBy(asc(workouts.scheduledFor))
    .limit(limit);
  return summarize(list);
}

/** Séances publiées dont la date est passée mais qui n'ont jamais été faites. */
export async function getMissedWorkouts(limit = 6): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.isTemplate, false),
        eq(workouts.status, "published"),
        isNotNull(workouts.scheduledFor),
        lt(workouts.scheduledFor, todayISO()),
      ),
    )
    .orderBy(desc(workouts.scheduledFor))
    .limit(limit);
  return summarize(list);
}

export async function getCompletedWorkouts(limit = 60): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.isTemplate, false), eq(workouts.status, "done")))
    .orderBy(desc(workouts.scheduledFor), desc(workouts.completedAt))
    .limit(limit);
  return summarize(list);
}

/** Toutes les séances côté coach (brouillons compris), les plus récentes d'abord. */
export async function getCoachWorkouts(limit = 120): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(eq(workouts.isTemplate, false))
    .orderBy(desc(workouts.scheduledFor), desc(workouts.createdAt))
    .limit(limit);
  return summarize(list);
}

export async function getTemplates(): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(eq(workouts.isTemplate, true))
    .orderBy(desc(workouts.updatedAt));
  return summarize(list);
}

/** Séances déjà planifiées sur une période (pour le calendrier du coach). */
export async function getWorkoutsBetween(fromISO: string, toISO: string): Promise<WorkoutSummary[]> {
  const list = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.isTemplate, false),
        isNotNull(workouts.scheduledFor),
        gte(workouts.scheduledFor, fromISO),
        sql`${workouts.scheduledFor} <= ${toISO}`,
      ),
    )
    .orderBy(asc(workouts.scheduledFor));
  return summarize(list);
}

/* ------------------------------ Statistiques ----------------------------- */

export type Stats = {
  totalSessions: number;
  sessionsThisMonth: number;
  weekStreak: number;
  totalVolumeKg: number;
  totalMinutes: number;
  lastSessionDate: string | null;
  sessionsThisWeek: number;
  /** Estimation cumulée, null si le profil physique n'est pas renseigné. */
  totalCalories: number | null;
};

export async function getStats(): Promise<Stats> {
  const done = await db
    .select({
      id: workouts.id,
      scheduledFor: workouts.scheduledFor,
      completedAt: workouts.completedAt,
      durationMinutes: workouts.durationMinutes,
    })
    .from(workouts)
    .where(and(eq(workouts.isTemplate, false), eq(workouts.status, "done")))
    .orderBy(desc(workouts.scheduledFor));

  const [volume] = await db
    .select({
      total: sql<number>`coalesce(sum(coalesce(${setLogs.reps}, 0) * coalesce(${setLogs.weightKg}, 0)), 0)::float`,
    })
    .from(setLogs)
    .where(eq(setLogs.done, true));

  // Les calories sont recalculées à chaque affichage : toute séance déjà
  // terminée en profite, et un changement de poids met le passé à jour.
  const profile = readProfile(await getSettings());
  let totalCalories: number | null = null;
  if (isProfileComplete(profile) && done.length > 0) {
    const effort = await effortEntriesByWorkout(done.map((w) => w.id));
    const durations = new Map(done.map((w) => [w.id, w.durationMinutes]));
    totalCalories = 0;
    for (const [workoutId, entries] of effort) {
      const minutes = durations.get(workoutId);
      totalCalories +=
        estimateCalories(entries, profile, minutes ? minutes * 60 : null) ?? 0;
    }
  }

  const dates = done
    .map((w) => w.scheduledFor ?? (w.completedAt ? w.completedAt.toISOString().slice(0, 10) : null))
    .filter((d): d is string => Boolean(d))
    .sort()
    .reverse();

  const today = todayISO();
  const thisMonth = today.slice(0, 7);
  const thisWeek = startOfWeekISO(today);

  // Série : nombre de semaines consécutives avec au moins une séance terminée.
  const weeks = new Set(dates.map(startOfWeekISO));
  let weekStreak = 0;
  let cursor = thisWeek;
  if (!weeks.has(cursor)) {
    // La semaine en cours peut être encore vide sans casser la série.
    const previous = shiftWeek(cursor, -1);
    cursor = weeks.has(previous) ? previous : cursor;
  }
  while (weeks.has(cursor)) {
    weekStreak++;
    cursor = shiftWeek(cursor, -1);
  }

  return {
    totalSessions: dates.length,
    sessionsThisMonth: dates.filter((d) => d.startsWith(thisMonth)).length,
    sessionsThisWeek: dates.filter((d) => startOfWeekISO(d) === thisWeek).length,
    weekStreak,
    totalVolumeKg: Math.round(volume?.total ?? 0),
    totalMinutes: done.reduce((acc, w) => acc + (w.durationMinutes ?? 0), 0),
    lastSessionDate: dates[0] ?? null,
    totalCalories,
  };
}

function shiftWeek(iso: string, weeks: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + weeks * 7);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

/* ------------------------------ Progression ------------------------------ */

export type ExerciseProgressPoint = {
  date: string;
  bestWeight: number | null;
  bestReps: number | null;
  totalVolume: number;
  totalReps: number;
  bestTimeSec: number | null;
  bestDistanceM: number | null;
  sets: number;
};

export type ExerciseProgress = {
  exercise: Exercise;
  points: ExerciseProgressPoint[];
};

/** Exercices déjà réalisés au moins une fois, avec le nombre de séances. */
export async function getTrackedExercises(): Promise<
  Array<{ exercise: Exercise; sessions: number; lastDate: string | null }>
> {
  const rows = await db
    .select({
      exercise: exercises,
      sessions: sql<number>`count(distinct ${setLogs.workoutId})::int`,
      lastDate: sql<string | null>`max(coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date))::text`,
    })
    .from(setLogs)
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(eq(setLogs.done, true))
    .groupBy(exercises.id)
    .orderBy(desc(sql`max(coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date))`));

  return rows;
}

export async function getExerciseProgress(exerciseId: string): Promise<ExerciseProgress | null> {
  const exercise = await getExercise(exerciseId);
  if (!exercise) return null;

  const points = await db
    .select({
      date: sql<string>`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)::text`,
      bestWeight: sql<number | null>`max(${setLogs.weightKg})::float`,
      bestReps: sql<number | null>`max(${setLogs.reps})::int`,
      totalVolume: sql<number>`coalesce(sum(coalesce(${setLogs.reps}, 0) * coalesce(${setLogs.weightKg}, 0)), 0)::float`,
      totalReps: sql<number>`coalesce(sum(${setLogs.reps}), 0)::int`,
      bestTimeSec: sql<number | null>`max(${setLogs.timeSec})::int`,
      bestDistanceM: sql<number | null>`max(${setLogs.distanceM})::int`,
      sets: sql<number>`count(*)::int`,
    })
    .from(setLogs)
    .where(and(eq(setLogs.exerciseId, exerciseId), eq(setLogs.done, true)))
    .groupBy(sql`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)`)
    .orderBy(asc(sql`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)`));

  return { exercise, points };
}

/** Meilleure perf et dernière perf pour un lot d'exercices — affiché pendant la séance. */
export type LastPerf = {
  exerciseId: string;
  lastDate: string | null;
  lastWeight: number | null;
  lastReps: number | null;
  lastTimeSec: number | null;
  lastDistanceM: number | null;
  bestWeight: number | null;
  bestReps: number | null;
  bestTimeSec: number | null;
  bestDistanceM: number | null;
};

export async function getLastPerformances(
  exerciseIds: string[],
  excludeWorkoutId?: string,
): Promise<Map<string, LastPerf>> {
  if (exerciseIds.length === 0) return new Map();

  const conditions = [inArray(setLogs.exerciseId, exerciseIds), eq(setLogs.done, true)];
  if (excludeWorkoutId) conditions.push(sql`${setLogs.workoutId} <> ${excludeWorkoutId}`);

  const rows = await db
    .select({
      exerciseId: setLogs.exerciseId,
      lastDate: sql<string | null>`max(coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date))::text`,
      bestWeight: sql<number | null>`max(${setLogs.weightKg})::float`,
      bestReps: sql<number | null>`max(${setLogs.reps})::int`,
      bestTimeSec: sql<number | null>`max(${setLogs.timeSec})::int`,
      bestDistanceM: sql<number | null>`max(${setLogs.distanceM})::int`,
    })
    .from(setLogs)
    .where(and(...conditions))
    .groupBy(setLogs.exerciseId);

  // Dernière séance connue : on récupère la meilleure série de la date la plus récente.
  const recent = await db
    .select({
      exerciseId: setLogs.exerciseId,
      day: sql<string>`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)::text`,
      weight: sql<number | null>`max(${setLogs.weightKg})::float`,
      reps: sql<number | null>`max(${setLogs.reps})::int`,
      timeSec: sql<number | null>`max(${setLogs.timeSec})::int`,
      distanceM: sql<number | null>`max(${setLogs.distanceM})::int`,
    })
    .from(setLogs)
    .where(and(...conditions))
    .groupBy(setLogs.exerciseId, sql`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)`)
    .orderBy(desc(sql`coalesce(${setLogs.performedOn}, ${setLogs.loggedAt}::date)`));

  const lastByExercise = new Map<
    string,
    { weight: number | null; reps: number | null; timeSec: number | null; distanceM: number | null }
  >();
  for (const row of recent) {
    if (!lastByExercise.has(row.exerciseId)) {
      lastByExercise.set(row.exerciseId, {
        weight: row.weight,
        reps: row.reps,
        timeSec: row.timeSec,
        distanceM: row.distanceM,
      });
    }
  }

  return new Map(
    rows.map((r) => [
      r.exerciseId,
      {
        exerciseId: r.exerciseId,
        lastDate: r.lastDate,
        lastWeight: lastByExercise.get(r.exerciseId)?.weight ?? null,
        lastReps: lastByExercise.get(r.exerciseId)?.reps ?? null,
        lastTimeSec: lastByExercise.get(r.exerciseId)?.timeSec ?? null,
        lastDistanceM: lastByExercise.get(r.exerciseId)?.distanceM ?? null,
        bestWeight: r.bestWeight,
        bestReps: r.bestReps,
        bestTimeSec: r.bestTimeSec,
        bestDistanceM: r.bestDistanceM,
      },
    ]),
  );
}

/* -------------------------------- Réglages ------------------------------- */

const DEFAULT_SETTINGS: Record<string, string> = {
  athlete_name: "",
  goal_per_week: "3",
  motivation: "",
  // Profil physique : sert uniquement à estimer les calories dépensées.
  athlete_sex: "",
  athlete_height_cm: "",
  athlete_weight_kg: "",
  athlete_age: "",
};

export const getSettings = cache(async function getSettings(): Promise<
  Record<string, string>
> {
  try {
    const rows = await db.select().from(settings);
    const map = { ...DEFAULT_SETTINGS };
    for (const row of rows) map[row.key] = row.value;
    return map;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
});


/* ------------------------------ Progression ------------------------------ */

export type ProgressionData = {
  stats: ProgressionStats;
  xp: number;
  level: LevelProgress;
  categories: CategoryProgress[];
  badges: BadgeState[];
  /** XP rapportés par chaque séance, la plus récente d'abord. */
  recentSessions: Array<{ id: string; title: string; date: string | null; xp: number }>;
};

/**
 * Reconstruit tout le système de progression depuis les séances terminées.
 *
 * Rien n'est stocké : niveaux, rangs et accomplissements sont recalculés à
 * chaque affichage. Les séances déjà enregistrées comptent donc d'emblée, et
 * aucune donnée existante n'est modifiée.
 */
export const getProgression = cache(async function getProgression(
  /** Séance à ignorer, pour comparer l'avant et l'après d'une séance en cours. */
  excludeWorkoutId?: string,
): Promise<ProgressionData> {
  const stats: ProgressionStats = {
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

  const empty: ProgressionData = {
    stats,
    xp: 0,
    level: levelFromXp(0),
    categories: categoryProgress(stats),
    badges: badgeStates(stats),
    recentSessions: [],
  };

  let sessions: Array<{
    id: string;
    title: string;
    scheduledFor: string | null;
    completedAt: Date | null;
    durationMinutes: number | null;
  }>;

  try {
    sessions = await db
      .select({
        id: workouts.id,
        title: workouts.title,
        scheduledFor: workouts.scheduledFor,
        completedAt: workouts.completedAt,
        durationMinutes: workouts.durationMinutes,
      })
      .from(workouts)
      .where(and(eq(workouts.isTemplate, false), eq(workouts.status, "done")))
      .orderBy(desc(workouts.scheduledFor));
  } catch {
    return empty;
  }

  if (excludeWorkoutId) sessions = sessions.filter((w) => w.id !== excludeWorkoutId);
  if (sessions.length === 0) return empty;

  const ids = sessions.map((w) => w.id);

  // Une ligne par série validée, avec sa famille d'exercices.
  const logs = await db
    .select({
      workoutId: setLogs.workoutId,
      exerciseId: setLogs.exerciseId,
      category: exercises.category,
      reps: setLogs.reps,
      weightKg: setLogs.weightKg,
    })
    .from(setLogs)
    .innerJoin(exercises, eq(exercises.id, setLogs.exerciseId))
    .where(and(inArray(setLogs.workoutId, ids), eq(setLogs.done, true)));

  // Séries prévues par le coach, pour savoir si la séance a été bouclée.
  const planned = await db
    .select({
      workoutId: workoutItems.workoutId,
      sets: sql<number>`coalesce(sum(${workoutItems.sets}), 0)::int`,
    })
    .from(workoutItems)
    .where(inArray(workoutItems.workoutId, ids))
    .groupBy(workoutItems.workoutId);

  const plannedMap = new Map(planned.map((p) => [p.workoutId, p.sets]));
  const profile = readProfile(await getSettings());
  const effort = isProfileComplete(profile)
    ? await effortEntriesByWorkout(ids)
    : new Map<string, EffortEntry[]>();

  const loggedByWorkout = new Map<string, number>();
  const volumeByWorkout = new Map<string, number>();
  const duoWorkouts = new Set<string>();
  const distinctExercises = new Set<string>();

  for (const log of logs) {
    stats.totalSets++;
    loggedByWorkout.set(log.workoutId, (loggedByWorkout.get(log.workoutId) ?? 0) + 1);
    stats.setsByCategory[log.category] = (stats.setsByCategory[log.category] ?? 0) + 1;
    distinctExercises.add(log.exerciseId);
    if (log.category === "duo") duoWorkouts.add(log.workoutId);

    const volume = (log.reps ?? 0) * (log.weightKg ?? 0);
    if (volume > 0) {
      stats.totalVolumeKg += volume;
      volumeByWorkout.set(log.workoutId, (volumeByWorkout.get(log.workoutId) ?? 0) + volume);
    }
  }

  stats.sessions = sessions.length;
  stats.distinctExercises = distinctExercises.size;
  stats.duoSessions = duoWorkouts.size;
  stats.totalVolumeKg = Math.round(stats.totalVolumeKg);

  const recentSessions: ProgressionData["recentSessions"] = [];
  let xp = 0;

  for (const session of sessions) {
    const loggedSets = loggedByWorkout.get(session.id) ?? 0;
    const minutes = session.durationMinutes ?? 0;
    const entries = effort.get(session.id);
    const calories = entries
      ? estimateCalories(entries, profile, minutes ? minutes * 60 : null)
      : null;

    stats.totalMinutes += minutes;
    stats.totalCalories += calories ?? 0;
    stats.longestSessionMinutes = Math.max(stats.longestSessionMinutes, minutes);

    const plannedSets = plannedMap.get(session.id) ?? 0;
    if (plannedSets > 0 && loggedSets >= plannedSets) stats.perfectSessions++;

    const earned = sessionXp({
      loggedSets,
      plannedSets,
      calories,
      volumeKg: volumeByWorkout.get(session.id) ?? 0,
    }).total;
    xp += earned;

    recentSessions.push({
      id: session.id,
      title: session.title,
      date: session.scheduledFor,
      xp: earned,
    });
  }

  /* --- Régularité : séries de semaines et meilleure semaine --- */
  const dates = sessions
    .map((w) => w.scheduledFor ?? (w.completedAt ? w.completedAt.toISOString().slice(0, 10) : null))
    .filter((d): d is string => Boolean(d));

  const perWeek = new Map<string, number>();
  for (const date of dates) {
    const week = startOfWeekISO(date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + 1);
  }
  stats.bestWeekSessions = Math.max(0, ...perWeek.values());

  const weeks = [...perWeek.keys()].sort();
  let run = 0;
  let best = 0;
  for (let i = 0; i < weeks.length; i++) {
    run = i > 0 && shiftWeek(weeks[i], -1) === weeks[i - 1] ? run + 1 : 1;
    best = Math.max(best, run);
  }
  stats.bestWeekStreak = best;

  const thisWeek = startOfWeekISO(todayISO());
  let cursor = perWeek.has(thisWeek) ? thisWeek : shiftWeek(thisWeek, -1);
  while (perWeek.has(cursor)) {
    stats.weekStreak++;
    cursor = shiftWeek(cursor, -1);
  }

  stats.totalCalories = Math.round(stats.totalCalories);

  return {
    stats,
    xp,
    level: levelFromXp(xp),
    categories: categoryProgress(stats),
    badges: badgeStates(stats),
    recentSessions: recentSessions.slice(0, 5),
  };
});
