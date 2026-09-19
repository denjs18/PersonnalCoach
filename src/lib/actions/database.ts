"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db, exercises } from "@/lib/db";
import { SCHEMA_STATEMENTS } from "@/lib/db/schema-sql";
import { EXERCISE_LIBRARY } from "@/lib/exercise-library";
import { DEFAULT_MET } from "@/lib/constants";
import { requireCoach } from "@/lib/auth";

export type DatabaseState = {
  ready: boolean;
  total: number;
  custom: number;
  missing: number;
};

/** Combien d'exercices de la bibliothèque de base manquent en base ? */
export async function getDatabaseStateAction(): Promise<DatabaseState> {
  await requireCoach();
  try {
    const [row] = await db
      .select({
        total: sql<number>`count(*)::int`,
        custom: sql<number>`count(*) FILTER (WHERE ${exercises.isCustom})::int`,
        seeded: sql<number>`count(*) FILTER (WHERE NOT ${exercises.isCustom})::int`,
      })
      .from(exercises);

    return {
      ready: true,
      total: row?.total ?? 0,
      custom: row?.custom ?? 0,
      missing: Math.max(0, EXERCISE_LIBRARY.length - (row?.seeded ?? 0)),
    };
  } catch {
    // Les tables n'existent pas encore.
    return { ready: false, total: 0, custom: 0, missing: EXERCISE_LIBRARY.length };
  }
}

/**
 * Crée les tables manquantes puis (re)synchronise la bibliothèque de base.
 * Idempotent, et les exercices créés à la main ne sont jamais écrasés.
 */
export async function initDatabaseAction(): Promise<
  { ok: true; state: DatabaseState } | { ok: false; error: string }
> {
  await requireCoach();

  try {
    for (const statement of SCHEMA_STATEMENTS) {
      await db.execute(sql.raw(statement));
    }

    // Un seul aller-retour : 119 lignes, c'est largement sous les limites.
    await db
      .insert(exercises)
      .values(
        EXERCISE_LIBRARY.map((ex) => ({
          name: ex.name,
          category: ex.category,
          equipment: [...ex.equipment],
          muscles: [...ex.muscles],
          description: ex.description,
          steps: [...ex.steps],
          cues: ex.cues,
          met: ex.met ?? DEFAULT_MET[ex.category],
          usesIncline: ex.usesIncline ?? false,
          repSeconds: ex.repSeconds ?? null,
          tracking: ex.tracking,
          isCustom: false,
        })),
      )
      .onConflictDoUpdate({
        target: exercises.name,
        set: {
          category: sql`excluded.category`,
          equipment: sql`excluded.equipment`,
          muscles: sql`excluded.muscles`,
          description: sql`excluded.description`,
          steps: sql`excluded.steps`,
          cues: sql`excluded.cues`,
          met: sql`excluded.met`,
          usesIncline: sql`excluded.uses_incline`,
          repSeconds: sql`excluded.rep_seconds`,
          tracking: sql`excluded.tracking`,
        },
        // On ne touche pas aux exercices que le coach a écrits lui-même.
        setWhere: sql`${exercises.isCustom} = false`,
      });

    revalidatePath("/", "layout");
    return { ok: true, state: await getDatabaseStateAction() };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      error: message.includes("DATABASE_URL")
        ? "DATABASE_URL n'est pas configuré sur le serveur."
        : `La base a refusé l'opération : ${message.slice(0, 200)}`,
    };
  }
}
