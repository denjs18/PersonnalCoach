import type { ExerciseProgressPoint } from "@/lib/queries";

export type ProgressSeries = {
  values: number[];
  unit: string;
  label: string;
  /** Écart entre la première et la dernière séance, null s'il n'y en a qu'une. */
  delta: number | null;
};

const sum = (points: ExerciseProgressPoint[], pick: (p: ExerciseProgressPoint) => number | null) =>
  points.reduce((acc, p) => acc + (pick(p) ?? 0), 0);

/**
 * Choisit la mesure la plus parlante pour un exercice donné.
 * Si le coach a prévu du poids mais qu'elle n'en a jamais noté, on suit les
 * répétitions plutôt que d'afficher une courbe plate à zéro.
 */
export function buildSeries(
  tracking: string,
  points: ExerciseProgressPoint[],
): ProgressSeries {
  const finish = (values: number[], unit: string, label: string): ProgressSeries => ({
    values,
    unit,
    label,
    delta:
      values.length > 1
        ? Math.round((values[values.length - 1] - values[0]) * 10) / 10
        : null,
  });

  const hasWeight = sum(points, (p) => p.bestWeight) > 0;
  const hasTime = sum(points, (p) => p.bestTimeSec) > 0;
  const hasDistance = sum(points, (p) => p.bestDistanceM) > 0;
  const hasReps = sum(points, (p) => p.totalReps) > 0;

  if ((tracking === "reps_weight" || tracking === "reps") && hasWeight) {
    return finish(points.map((p) => p.bestWeight ?? 0), "kg", "Charge max");
  }
  if ((tracking === "distance" || tracking === "time_distance") && hasDistance) {
    return finish(points.map((p) => p.bestDistanceM ?? 0), "m", "Distance max");
  }
  if ((tracking === "time" || tracking === "time_distance") && hasTime) {
    return finish(points.map((p) => p.bestTimeSec ?? 0), "s", "Meilleur temps");
  }
  if (hasReps) {
    return finish(points.map((p) => p.totalReps), "reps", "Répétitions");
  }
  if (hasTime) {
    return finish(points.map((p) => p.bestTimeSec ?? 0), "s", "Meilleur temps");
  }
  if (hasDistance) {
    return finish(points.map((p) => p.bestDistanceM ?? 0), "m", "Distance max");
  }
  return finish(points.map(() => 0), "", "Séances");
}

export function formatDelta(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(1).replace(".", ",");
  return rounded > 0 ? `+${text}` : text;
}
