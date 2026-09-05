/**
 * Ce que l'athlète saisit pour une série, selon le mode de suivi de l'exercice.
 *
 * Module volontairement neutre : il sert au lecteur de séance comme au
 * constructeur côté coach, qui s'en sert pour prévenir quand une cible ne
 * pourra pas être notée.
 */

export function needsReps(tracking: string) {
  return tracking === "reps_weight" || tracking === "reps";
}

export function needsWeight(tracking: string) {
  return tracking === "reps_weight" || tracking === "distance_weight";
}

export function needsTime(tracking: string) {
  return tracking === "time" || tracking === "time_distance";
}

export function needsDistance(tracking: string) {
  return (
    tracking === "distance" || tracking === "time_distance" || tracking === "distance_weight"
  );
}
