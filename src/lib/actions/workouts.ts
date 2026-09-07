"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, setLogs, workoutItems, workouts } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { todayISO } from "@/lib/utils";

export type PlanItem = {
  /** id existant, ou null pour un nouvel exercice */
  id: string | null;
  exerciseId: string;
  section: string;
  sets: number;
  targetReps: string | null;
  targetWeight: number | null;
  targetTimeSec: number | null;
  targetDistanceM: number | null;
  targetInclinePct: number | null;
  restSec: number | null;
  note: string | null;
  supersetGroup: string | null;
  tracking: string | null;
};

export type WorkoutMeta = {
  title: string;
  scheduledFor: string | null;
  focus: string | null;
  coachNote: string | null;
  estimatedMinutes: number | null;
  intensity: number | null;
};

/* ------------------------------ Création --------------------------------- */

export async function createWorkoutAction(formData: FormData) {
  await requireCoach();
  const scheduledFor = String(formData.get("scheduledFor") || todayISO());
  const title = String(formData.get("title") || "").trim() || "Nouvelle séance";

  const [row] = await db
    .insert(workouts)
    .values({ title, scheduledFor, status: "draft" })
    .returning({ id: workouts.id });

  revalidatePath("/coach");
  redirect(`/coach/seance/${row.id}`);
}

/** Duplique une séance (ou un modèle) vers une nouvelle date. */
export async function duplicateWorkoutAction(sourceId: string, targetDate: string) {
  await requireCoach();

  const [source] = await db.select().from(workouts).where(eq(workouts.id, sourceId)).limit(1);
  if (!source) return { ok: false as const, error: "Séance introuvable." };

  const [copy] = await db
    .insert(workouts)
    .values({
      title: source.title,
      scheduledFor: targetDate,
      status: "draft",
      isTemplate: false,
      focus: source.focus,
      coachNote: source.coachNote,
      estimatedMinutes: source.estimatedMinutes,
      intensity: source.intensity,
    })
    .returning({ id: workouts.id });

  const items = await db
    .select()
    .from(workoutItems)
    .where(eq(workoutItems.workoutId, sourceId))
    .orderBy(asc(workoutItems.position));

  if (items.length > 0) {
    await db.insert(workoutItems).values(
      items.map((item, index) => ({
        workoutId: copy.id,
        exerciseId: item.exerciseId,
        section: item.section,
        position: index,
        sets: item.sets,
        targetReps: item.targetReps,
        targetWeight: item.targetWeight,
        targetTimeSec: item.targetTimeSec,
        targetDistanceM: item.targetDistanceM,
        targetInclinePct: item.targetInclinePct,
        restSec: item.restSec,
        note: item.note,
        supersetGroup: item.supersetGroup,
        tracking: item.tracking,
      })),
    );
  }

  revalidatePath("/coach");
  return { ok: true as const, id: copy.id };
}

export async function saveAsTemplateAction(workoutId: string, name: string) {
  await requireCoach();
  const [source] = await db.select().from(workouts).where(eq(workouts.id, workoutId)).limit(1);
  if (!source) return { ok: false as const, error: "Séance introuvable." };

  const [tpl] = await db
    .insert(workouts)
    .values({
      title: name.trim() || source.title,
      scheduledFor: null,
      status: "draft",
      isTemplate: true,
      focus: source.focus,
      coachNote: source.coachNote,
      estimatedMinutes: source.estimatedMinutes,
      intensity: source.intensity,
    })
    .returning({ id: workouts.id });

  const items = await db
    .select()
    .from(workoutItems)
    .where(eq(workoutItems.workoutId, workoutId))
    .orderBy(asc(workoutItems.position));

  if (items.length > 0) {
    await db.insert(workoutItems).values(
      items.map((item, index) => ({
        workoutId: tpl.id,
        exerciseId: item.exerciseId,
        section: item.section,
        position: index,
        sets: item.sets,
        targetReps: item.targetReps,
        targetWeight: item.targetWeight,
        targetTimeSec: item.targetTimeSec,
        targetDistanceM: item.targetDistanceM,
        targetInclinePct: item.targetInclinePct,
        restSec: item.restSec,
        note: item.note,
        supersetGroup: item.supersetGroup,
        tracking: item.tracking,
      })),
    );
  }

  revalidatePath("/coach");
  return { ok: true as const, id: tpl.id };
}

/* ----------------------------- Enregistrement ---------------------------- */

/**
 * Sauvegarde complète d'une séance : métadonnées + liste d'exercices.
 * Les exercices retirés côté coach sont supprimés, les autres mis à jour.
 */
export async function saveWorkoutPlanAction(
  workoutId: string,
  meta: WorkoutMeta,
  items: PlanItem[],
): Promise<{ ok: true; itemIds: Record<number, string> } | { ok: false; error: string }> {
  await requireCoach();

  if (!meta.title.trim()) return { ok: false, error: "Donne un titre à la séance." };

  await db
    .update(workouts)
    .set({
      title: meta.title.trim(),
      scheduledFor: meta.scheduledFor,
      focus: meta.focus?.trim() || null,
      coachNote: meta.coachNote?.trim() || null,
      estimatedMinutes: meta.estimatedMinutes,
      intensity: meta.intensity,
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  const existing = await db
    .select({ id: workoutItems.id })
    .from(workoutItems)
    .where(eq(workoutItems.workoutId, workoutId));

  const keptIds = new Set(items.map((i) => i.id).filter((id): id is string => Boolean(id)));
  const toDelete = existing.filter((row) => !keptIds.has(row.id)).map((row) => row.id);
  if (toDelete.length > 0) {
    await db.delete(workoutItems).where(inArray(workoutItems.id, toDelete));
  }

  const itemIds: Record<number, string> = {};

  for (const [index, item] of items.entries()) {
    const values = {
      workoutId,
      exerciseId: item.exerciseId,
      section: item.section,
      position: index,
      sets: Math.max(1, item.sets || 1),
      targetReps: item.targetReps?.trim() || null,
      targetWeight: item.targetWeight,
      targetTimeSec: item.targetTimeSec,
      targetDistanceM: item.targetDistanceM,
      targetInclinePct: item.targetInclinePct,
      restSec: item.restSec,
      note: item.note?.trim() || null,
      supersetGroup: item.supersetGroup?.trim() || null,
      tracking: item.tracking,
    };

    if (item.id) {
      await db.update(workoutItems).set(values).where(eq(workoutItems.id, item.id));
      itemIds[index] = item.id;
    } else {
      const [row] = await db.insert(workoutItems).values(values).returning({ id: workoutItems.id });
      itemIds[index] = row.id;
    }
  }

  revalidatePath("/coach");
  revalidatePath(`/coach/seance/${workoutId}`);
  revalidatePath("/app");
  return { ok: true, itemIds };
}

export async function setWorkoutStatusAction(workoutId: string, status: "draft" | "published") {
  await requireCoach();
  await db
    .update(workouts)
    .set({
      status,
      publishedAt: status === "published" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  revalidatePath("/coach");
  revalidatePath(`/coach/seance/${workoutId}`);
  revalidatePath("/app");
  return { ok: true as const };
}

export async function deleteWorkoutAction(workoutId: string) {
  await requireCoach();
  await db.delete(workouts).where(eq(workouts.id, workoutId));
  revalidatePath("/coach");
  revalidatePath("/app");
  return { ok: true as const };
}

/**
 * Corrige ce qui a été enregistré à la fin d'une séance. La durée n'est
 * connue de personne mieux que de celle qui s'est entraînée — et le coach doit
 * pouvoir la rectifier après coup.
 */
export async function updateWorkoutResultAction(
  workoutId: string,
  payload: { durationMinutes: number | null; athleteRating: number | null; athleteNote: string | null },
) {
  await requireCoach();

  await db
    .update(workouts)
    .set({
      durationMinutes:
        payload.durationMinutes === null ? null : Math.max(1, Math.round(payload.durationMinutes)),
      athleteRating: payload.athleteRating,
      athleteNote: payload.athleteNote?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(workouts.id, workoutId));

  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Le coach peut rouvrir une séance déjà validée (erreur de manip). */
export async function reopenWorkoutAction(workoutId: string) {
  await requireCoach();
  await db
    .update(workouts)
    .set({ status: "published", completedAt: null, updatedAt: new Date() })
    .where(eq(workouts.id, workoutId));
  revalidatePath("/coach");
  revalidatePath("/app");
  return { ok: true as const };
}

/** Nombre de séries réellement validées, utile pour les garde-fous côté coach. */
export async function countLoggedSets(workoutId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(setLogs)
    .where(and(eq(setLogs.workoutId, workoutId), eq(setLogs.done, true)));
  return row?.n ?? 0;
}
