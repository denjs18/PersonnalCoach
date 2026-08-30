import {
  DEFAULT_MET,
  PACE_MET,
  REST_MET,
  RESTING_OVER_BASAL,
  SECONDS_PER_REP,
  TRANSITION_SECONDS,
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

/**
 * Coût d'un MET pour cette personne, en kcal par minute.
 * Mifflin-St Jeor donne le métabolisme *basal* ; un MET correspond au repos
 * assis, un cran au-dessus.
 */
function restingKcalPerMinute(p: AthleteProfile): number | null {
  const bmr = basalMetabolicRate(p);
  return bmr === null ? null : (bmr * RESTING_OVER_BASAL) / 1440;
}

/* -------------------------------------------------------------------------- */
/*  Estimation du temps de travail                                            */
/* -------------------------------------------------------------------------- */

export type EffortItem = {
  id: string;
  category: string;
  met: number | null;
  /** Sert à reconnaître rameur, vélo et course pour le calcul d'allure. */
  equipment?: string[];
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

  // Changer d'exercice prend du temps : mise en place, charge, déplacement.
  const exerciseCount = new Set(done.map((e) => e.item.id)).size;
  seconds += Math.max(0, exerciseCount - 1) * TRANSITION_SECONDS;

  return Math.max(0, Math.round(seconds));
}

/* -------------------------------------------------------------------------- */
/*  Estimation des calories                                                   */
/* -------------------------------------------------------------------------- */

/** Quelle table d'allure appliquer, d'après le matériel de l'exercice. */
function paceTableFor(item: EffortItem): Array<[number, number]> | null {
  const equipment = item.equipment ?? [];
  if (equipment.includes("rameur")) return PACE_MET.rameur;
  if (equipment.includes("velo")) return PACE_MET.velo;
  // Pas de machine : une distance parcourue, c'est de la marche ou de la course.
  if (equipment.length === 0 || equipment.includes("aucun") || equipment.includes("poids_du_corps")) {
    return PACE_MET.course;
  }
  return null;
}

function metOf(item: EffortItem, set: EffortSet, profile: AthleteProfile): number {
  const base = item.met ?? DEFAULT_MET[categoryOf(item)];

  // Distance et durée notées : l'allure dit bien mieux que l'exercice ce que
  // l'effort a coûté (10 min de rameur tranquille ≠ 10 min à fond).
  if (set.distanceM && set.distanceM > 0 && set.timeSec && set.timeSec > 0) {
    const table = paceTableFor(item);
    if (table) {
      const metersPerMinute = set.distanceM / (set.timeSec / 60);
      const found = table.find(([max]) => metersPerMinute < max);
      if (found) return found[1];
    }
  }

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

  const perMinute = restingKcalPerMinute(profile) ?? 0;

  let total = 0;
  done.forEach(({ item, set }, index) => {
    const isLast = index === done.length - 1;
    total += setCalories(item, set, profile, !isLast) ?? 0;
  });

  // Les transitions entre exercices, à coût faible.
  const exerciseCount = new Set(done.map((e) => e.item.id)).size;
  total += (REST_MET * perMinute * Math.max(0, exerciseCount - 1) * TRANSITION_SECONDS) / 60;

  return Math.round(total);
}

export function formatCalories(value: number): string {
  return `${Math.round(value).toLocaleString("fr-FR")} kcal`;
}
