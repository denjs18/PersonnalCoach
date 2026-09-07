"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db, setLogs, workoutItems, workouts } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getProgression } from "@/lib/queries";
import { newlyEarned, type BadgeState, type LevelProgress } from "@/lib/levels";
import { todayISO } from "@/lib/utils";

export type SetEntry = {
  workoutItemId: string;
  exerciseId: string;
  setNumber: number;
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
  distanceM: number | null;
  inclinePct: number | null;
  rpe: number | null;
  done: boolean;
};

export async function startWorkoutAction(workoutId: string) {
  await requireRole();
  await db
    .update(workouts)
    .set({ startedAt: sql`coalesce(${workouts.startedAt}, now())` })
    .where(eq(workouts.id, workoutId));
  return { ok: true as const };
}

/** Enregistre (ou met à jour) un lot de séries. Appelé en continu pendant la séance. */
export async function saveSetLogsAction(workoutId: string, entries: SetEntry[]) {
  await requireRole();
  if (entries.length === 0) return { ok: true as const };

  const [workout] = await db
    .select({ scheduledFor: workouts.scheduledFor })
    .from(workouts)
    .where(eq(workouts.id, workoutId))
    .limit(1);
  if (!workout) return { ok: false as const, error: "Séance introuvable." };

  // On ne garde que les séries qui appartiennent bien à cette séance.
  const items = await db
    .select({ id: workoutItems.id, exerciseId: workoutItems.exerciseId })
    .from(workoutItems)
    .where(eq(workoutItems.workoutId, workoutId));
  const itemMap = new Map(items.map((i) => [i.id, i.exerciseId]));

  const valid = entries.filter((e) => itemMap.has(e.workoutItemId));
  if (valid.length === 0) return { ok: true as const };

  const performedOn = workout.scheduledFor ?? todayISO();

  await db
    .insert(setLogs)
    .values(
      valid.map((e) => ({
        workoutId,
        workoutItemId: e.workoutItemId,
        exerciseId: itemMap.get(e.workoutItemId)!,
        setNumber: e.setNumber,
        reps: e.reps,
        weightKg: e.weightKg,
        timeSec: e.timeSec,
        distanceM: e.distanceM,
        inclinePct: e.inclinePct,
        rpe: e.rpe,
        done: e.done,
        performedOn,
      })),
    )
    .onConflictDoUpdate({
      target: [setLogs.workoutItemId, setLogs.setNumber],
      set: {
        reps: sql`excluded.reps`,
        weightKg: sql`excluded.weight_kg`,
        timeSec: sql`excluded.time_sec`,
        distanceM: sql`excluded.distance_m`,
        inclinePct: sql`excluded.incline_pct`,
        rpe: sql`excluded.rpe`,
        done: sql`excluded.done`,
        performedOn: sql`excluded.performed_on`,
        // On garde l'heure de la première validation : c'est elle qui permet
        // de reconstituer la durée réelle de la séance.
        loggedAt: sql`case when ${setLogs.done} and excluded.done then ${setLogs.loggedAt} else now() end`,
      },
    });

  return { ok: true as const };
}

/** Supprime les séries au-delà du nombre prévu (quand l'athlète en retire une). */
export async function trimSetLogsAction(workoutItemId: string, maxSetNumber: number) {
  await requireRole();
  await db
    .delete(setLogs)
    .where(
      and(eq(setLogs.workoutItemId, workoutItemId), sql`${setLogs.setNumber} > ${maxSetNumber}`),
    );
  return { ok: true as const };
}

export type FinishOutcome = {
  xpGained: number;
  level: LevelProgress;
  leveledUp: boolean;
  newBadges: Array<Pick<BadgeState, "id" | "title" | "description" | "emoji">>;
};

export async function finishWorkoutAction(
  workoutId: string,
  payload: { rating: number | null; note: string | null; durationMinutes: number | null },
): Promise<{ ok: true; outcome: FinishOutcome | null }> {
  await requireRole();

  // Photo de la progression *avant* que cette séance ne compte, pour savoir
  // ce qu'elle vient de débloquer.
  const before = await getProgression(workoutId);

  await db
    .update(workouts)
    .set({
      status: "done",
      completedAt: new Date(),
      athleteRating: payload.rating,
      athleteNote: payload.note?.trim() || null,
      durationMinutes: payload.durationMinutes,
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  revalidatePath("/app");
  revalidatePath("/app/historique");
  revalidatePath("/app/progression");
  revalidatePath("/app/niveaux");
  revalidatePath("/coach");
  revalidatePath("/coach/suivi");

  let outcome: FinishOutcome | null = null;
  try {
    const after = await getProgression();
    outcome = {
      xpGained: Math.max(0, after.xp - before.xp),
      level: after.level,
      leveledUp: after.level.current.level > before.level.current.level,
      newBadges: newlyEarned(before.stats, after.stats).map((b) => ({
        id: b.id,
        title: b.title,
        description: b.description,
        emoji: b.emoji,
      })),
    };
  } catch {
    // La progression est un bonus : son échec ne doit pas empêcher de valider.
    outcome = null;
  }

  return { ok: true, outcome };
}
