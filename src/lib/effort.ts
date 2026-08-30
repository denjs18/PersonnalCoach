import {
  DEFAULT_MET,
  REST_MET,
  SECONDS_PER_REP,
  type CategoryKey,
} from "./constants";

/* -------------------------------------------------------------------------- */
/*  Profil de l'athlète                                                       */
/* -------------------------------------------------------------------------- */

export type AthleteProfile = {
  sex: "femme" | "homme" | null;
  heightCm: number | null;
  weightKg: number | null;
  age: number | null;
};

/** Le calcul des calories n'a de sens que si le profil est renseigné. */
export function isProfileComplete(p: AthleteProfile): boolean {
  return Boolean(p.sex && p.heightCm && p.weightKg);
}

export function readProfile(settings: Record<string, string>): AthleteProfile {
  const num = (key: string) => {
    const raw = Number(String(settings[key] ?? "").replace(",", "."));
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  };
  const sex = settings.athlete_sex;
  return {
    sex: sex === "femme" || sex === "homme" ? sex : null,
    heightCm: num("athlete_height_cm"),
    weightKg: num("athlete_weight_kg"),
    age: num("athlete_age"),
  };
}

/**
 * Métabolisme de base (Mifflin-St Jeor), en kcal par jour.
 * C'est lui qui personnalise l'estimation selon le sexe, la taille et le poids.
 * L'âge est optionnel : à défaut on prend 30 ans.
 */
export function basalMetabolicRate(p: AthleteProfile): number | null {
  if (!p.sex || !p.heightCm || !p.weightKg) return null;
  const age = p.age ?? 30;
  const base = 10 * p.weightKg + 6.25 * p.heightCm - 5 * age;
  return p.sex === "homme" ? base + 5 : base - 161;
}

/** Dépense au repos, en kcal par minute. */
function restingKcalPerMinute(p: AthleteProfile): number | null {
  const bmr = basalMetabolicRate(p);
  return bmr === null ? null : bmr / 1440;
}

/* -------------------------------------------------------------------------- */
/*  Estimation du temps de travail                                            */
/* -------------------------------------------------------------------------- */

export type EffortItem = {
  id: string;
  category: string;
  met: number | null;
  restSec: number | null;
  targetTimeSec: number | null;
  targetReps: string | null;
};

export type EffortSet = {
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
  distanceM: number | null;
  done: boolean;
};

function categoryOf(item: EffortItem): CategoryKey {
  return (item.category in DEFAULT_MET ? item.category : "force") as CategoryKey;
}

function parseFirstNumber(value: string | null): number | null {
  const match = value?.match(/\d+/);
  return match ? Number(match[0]) : null;
}

/**
 * Durée de l'effort d'une série, en secondes.
 * On se sert de ce qui a été noté ; sinon de l'objectif du coach ; sinon d'une
 * valeur moyenne pour la famille d'exercices.
 */
export function setEffortSeconds(item: EffortItem, set: EffortSet): number {
  if (set.timeSec && set.timeSec > 0) return set.timeSec;

  const perRep = SECONDS_PER_REP[categoryOf(item)];
  if (set.reps && set.reps > 0) return Math.round(set.reps * perRep);

  if (item.targetTimeSec && item.targetTimeSec > 0) return item.targetTimeSec;

  const targetReps = parseFirstNumber(item.targetReps);
  if (targetReps) return Math.round(targetReps * perRep);

  return 40;
}

function restSeconds(item: EffortItem): number {
  if (item.restSec !== null && item.restSec >= 0) return item.restSec;
  return categoryOf(item) === "mobilite" ? 10 : 45;
}

export type EffortEntry = { item: EffortItem; set: EffortSet };

/**
 * Temps de travail estimé d'une séance, en secondes.
 *
 * Volontairement calculé à partir des séries validées, et non du temps passé
 * l'app ouverte : ouvrir la séance en avance ou la laisser tourner pendant une
 * pause n'a aucun effet sur le résultat.
 */
export function estimateWorkSeconds(entries: EffortEntry[]): number {
  const done = entries.filter((e) => e.set.done);
  if (done.length === 0) return 0;

  let seconds = 0;
  for (const { item, set } of done) {
    seconds += setEffortSeconds(item, set) + restSeconds(item);
  }
  // Pas de repos après la toute dernière série.
  seconds -= restSeconds(done[done.length - 1].item);
  return Math.max(0, Math.round(seconds));
}

/* -------------------------------------------------------------------------- */
/*  Estimation des calories                                                   */
/* -------------------------------------------------------------------------- */

function metOf(item: EffortItem, set: EffortSet, profile: AthleteProfile): number {
  const base = item.met ?? DEFAULT_MET[categoryOf(item)];

  // Porter une charge coûte plus cher : on module jusqu'à +35 % selon le poids
  // soulevé, rapporté au poids de corps.
  if (set.weightKg && set.weightKg > 0 && profile.weightKg) {
    const ratio = Math.min(1, set.weightKg / profile.weightKg);
    return base * (1 + 0.35 * ratio);
  }
  return base;
}

/**
 * Calories d'une série (effort + repos qui suit), ou null si le profil de
 * l'athlète n'est pas renseigné.
 */
export function setCalories(
  item: EffortItem,
  set: EffortSet,
  profile: AthleteProfile,
  includeRest = true,
): number | null {
  const perMinute = restingKcalPerMinute(profile);
  if (perMinute === null || !set.done) return null;

  const effortMin = setEffortSeconds(item, set) / 60;
  const restMin = includeRest ? restSeconds(item) / 60 : 0;

  return metOf(item, set, profile) * perMinute * effortMin + REST_MET * perMinute * restMin;
}

/** Calories d'un lot de séries. null si le profil est incomplet. */
export function estimateCalories(
  entries: EffortEntry[],
  profile: AthleteProfile,
): number | null {
  if (!isProfileComplete(profile)) return null;

  const done = entries.filter((e) => e.set.done);
  if (done.length === 0) return 0;

  let total = 0;
  done.forEach(({ item, set }, index) => {
    const isLast = index === done.length - 1;
    total += setCalories(item, set, profile, !isLast) ?? 0;
  });
  return Math.round(total);
}

export function formatCalories(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} kcal`;
}
