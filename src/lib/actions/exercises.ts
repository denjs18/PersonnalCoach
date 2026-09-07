"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db, exercises } from "@/lib/db";
import { requireCoach } from "@/lib/auth";
import { DEFAULT_MET, type CategoryKey } from "@/lib/constants";
import type { Exercise } from "@/lib/db";

export type ExerciseInput = {
  name: string;
  category: string;
  equipment: string[];
  muscles: string[];
  description?: string | null;
  steps: string[];
  cues?: string | null;
  tracking: string;
  /** Coût énergétique du mouvement, en MET. À défaut, celui de la catégorie. */
  met?: number | null;
  /** Exercice en pente : la dépense se calcule à partir de l'inclinaison. */
  usesIncline?: boolean;
};

function clean(input: ExerciseInput): ExerciseInput {
  return {
    name: input.name.trim(),
    category: input.category || "force",
    equipment: (input.equipment ?? []).filter(Boolean),
    muscles: (input.muscles ?? []).map((m) => m.trim()).filter(Boolean),
    description: input.description?.trim() || null,
    steps: (input.steps ?? []).map((s) => s.trim()).filter(Boolean),
    cues: input.cues?.trim() || null,
    tracking: input.tracking || "reps_weight",
    met: metOf(input),
    usesIncline: input.usesIncline ?? false,
  };
}

/** Le MET retenu : celui choisi par le coach, sinon celui de la catégorie. */
function metOf(input: ExerciseInput): number {
  const chosen = Number(input.met);
  if (Number.isFinite(chosen) && chosen > 0) return chosen;
  const category = input.category || "force";
  return DEFAULT_MET[(category in DEFAULT_MET ? category : "force") as CategoryKey];
}

export async function createExerciseAction(
  input: ExerciseInput,
): Promise<{ ok: true; exercise: Exercise } | { ok: false; error: string }> {
  await requireCoach();
  const data = clean(input);
  if (!data.name) return { ok: false, error: "Il faut un nom d'exercice." };

  try {
    const [row] = await db
      .insert(exercises)
      .values({ ...data, isCustom: true })
      .returning();
    revalidatePath("/coach/exercices");
    return { ok: true, exercise: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes("exercises_name_unique")) {
      return { ok: false, error: "Un exercice porte déjà ce nom." };
    }
    return { ok: false, error: "Impossible d'enregistrer l'exercice." };
  }
}

export async function updateExerciseAction(
  id: string,
  input: ExerciseInput,
): Promise<{ ok: true; exercise: Exercise } | { ok: false; error: string }> {
  await requireCoach();
  const data = clean(input);
  if (!data.name) return { ok: false, error: "Il faut un nom d'exercice." };

  try {
    const [row] = await db.update(exercises).set(data).where(eq(exercises.id, id)).returning();
    revalidatePath("/coach/exercices");
    return { ok: true, exercise: row };
  } catch {
    return { ok: false, error: "Impossible de modifier l'exercice." };
  }
}

export async function setExerciseArchivedAction(id: string, archived: boolean) {
  await requireCoach();
  await db.update(exercises).set({ isArchived: archived }).where(eq(exercises.id, id));
  revalidatePath("/coach/exercices");
}
