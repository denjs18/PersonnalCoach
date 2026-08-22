"use server";

import { revalidatePath } from "next/cache";
import { sql } from "drizzle-orm";
import { db, settings } from "@/lib/db";
import { requireCoach } from "@/lib/auth";

export async function saveSettingsAction(values: Record<string, string>) {
  await requireCoach();
  const entries = Object.entries(values).filter(([key]) => key.length > 0);
  if (entries.length === 0) return { ok: true as const };

  await db
    .insert(settings)
    .values(entries.map(([key, value]) => ({ key, value })))
    .onConflictDoUpdate({ target: settings.key, set: { value: sql`excluded.value` } });

  revalidatePath("/", "layout");
  return { ok: true as const };
}
