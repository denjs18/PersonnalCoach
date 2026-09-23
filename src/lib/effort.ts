import {
  DEFAULT_INCLINE_PCT,
  DEFAULT_MET,
  DEFAULT_WALK_SPEED_M_MIN,
  ECCENTRIC_FACTOR,
  GRAVITY,
  JOULES_PER_KCAL,
  MAX_GAP_SECONDS,
  MUSCLE_EFFICIENCY,
  REP_RANGE_M,
  SLED_FRICTION,
  SLED_OWN_MASS_KG,
  PACE_MET,
  REST_MET,
  RESTING_OVER_BASAL,
  RUNNING_THRESHOLD_M_MIN,
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
  targetDistanceM?: number | null;
  targetReps: string | null;
  /** Exercice en pente : la dépense se calcule à partir de l'inclinaison. */
  usesIncline?: boolean;
  targetInclinePct?: number | null;
  /**
   * Durée d'une répétition, en secondes. Certains mouvements ne suivent pas
   * la cadence de leur famille : un burpee avec saut prend cinq fois plus
   * longtemps qu'une montée de genoux, pour la même famille « cardio ».
   */
  repSeconds?: number | null;
  /**
   * Hauteur parcourue par la charge sur une répétition, en mètres. Une balle
   * de wall ball monte de près de deux mètres là où un haltère de curl en fait
   * quarante centimètres : la famille ne suffit pas à le dire.
   */
  repRangeM?: number | null;
};

export type EffortSet = {
  reps: number | null;
  weightKg: number | null;
  timeSec: number | null;
  distanceM: number | null;
  inclinePct?: number | null;
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

  const perRep = repSecondsOf(item);
  if (set.reps && set.reps > 0) return Math.round(set.reps * perRep);

  if (item.targetTimeSec && item.targetTimeSec > 0) return item.targetTimeSec;

  const targetReps = parseFirstNumber(item.targetReps);
  if (targetReps) return Math.round(targetReps * perRep);

  // Un déplacement chargé (traîneau, port de charge) : ni durée ni répétitions,
  // mais une distance. On l'estime à une allure de marche lestée.
  const distance = set.distanceM ?? item.targetDistanceM;
  if (distance && distance > 0) return Math.round((distance / 45) * 60);

  return 40;
}

/** Amplitude d'une répétition : celle de l'exercice, sinon celle de sa famille. */
function repRangeOf(item: EffortItem): number {
  const own = item.repRangeM;
  if (own !== null && own !== undefined && own > 0) return own;
  return REP_RANGE_M[categoryOf(item)];
}

/** Durée d'une répétition : celle de l'exercice, sinon celle de sa famille. */
function repSecondsOf(item: EffortItem): number {
  const own = item.repSeconds;
  if (own !== null && own !== undefined && own > 0) return own;
  return SECONDS_PER_REP[categoryOf(item)];
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

/**
 * Durée réelle d'une séance, mesurée entre la première et la dernière série
 * validées. Les intervalles anormalement longs (téléphone posé, sortie de la
 * salle) sont plafonnés : ouvrir l'app en avance ou reprendre le lendemain
 * n'a aucun effet.
 */
export function measuredWorkSeconds(
  validationTimes: number[],
  firstSetEffortSeconds = 40,
): number | null {
  const times = [...validationTimes].sort((a, b) => a - b);
  if (times.length < 2) return null;

  let seconds = firstSetEffortSeconds;
  for (let i = 1; i < times.length; i++) {
    seconds += Math.min((times[i] - times[i - 1]) / 1000, MAX_GAP_SECONDS);
  }
  return Math.round(seconds);
}

/* -------------------------------------------------------------------------- */
/*  Estimation des calories                                                   */
/* -------------------------------------------------------------------------- */

/** Quelle table d'allure appliquer, d'après le matériel de l'exercice. */
function paceTableFor(item: EffortItem): Array<[number, number]> | null {
  const equipment = item.equipment ?? [];
  if (equipment.includes("traineau")) return null; // charge tractée : l'allure ne dit rien
  if (equipment.includes("rameur")) return PACE_MET.rameur;
  if (equipment.includes("ski_erg")) return PACE_MET.ski_erg;
  if (equipment.includes("velo")) return PACE_MET.velo;
  // Pas de machine : une distance parcourue, c'est de la marche ou de la course.
  if (equipment.length === 0 || equipment.includes("aucun") || equipment.includes("poids_du_corps")) {
    return PACE_MET.course;
  }
  return null;
}

/** Allure notée d'une série, en mètres par minute. */
function paceOf(set: EffortSet): number | null {
  if (!set.distanceM || set.distanceM <= 0 || !set.timeSec || set.timeSec <= 0) return null;
  return set.distanceM / (set.timeSec / 60);
}

/**
 * Coût d'un déplacement en pente, en MET.
 *
 * Équations de l'ACSM, qui donnent la consommation d'oxygène à partir de
 * l'allure et de la pente : monter coûte cher même lentement, et c'est
 * précisément ce que les tables d'allure à plat ratent. Marcher à 2,7 km/h,
 * c'est 2,3 MET sur le plat mais 5,1 MET à 12 %.
 *
 *   marche : VO₂ = 0,1 × allure + 1,8 × allure × pente + 3,5
 *   course : VO₂ = 0,2 × allure + 0,9 × allure × pente + 3,5
 *
 * (allure en m/min, pente en fraction, VO₂ en ml/kg/min ; 1 MET = 3,5.)
 */
export function inclineMet(metersPerMinute: number, inclinePct: number): number {
  const pace = Math.max(0, metersPerMinute);
  const grade = Math.max(0, inclinePct) / 100;
  const running = pace >= RUNNING_THRESHOLD_M_MIN;

  const horizontal = (running ? 0.2 : 0.1) * pace;
  const vertical = (running ? 0.9 : 1.8) * pace * grade;
  return (horizontal + vertical + 3.5) / 3.5;
}

function metOf(item: EffortItem, set: EffortSet, profile: AthleteProfile): number {
  const base = item.met ?? DEFAULT_MET[categoryOf(item)];

  // Exercice en pente : c'est l'inclinaison qui commande, pas la table d'allure
  // à plat, qui prendrait une montée lente pour une promenade.
  if (item.usesIncline) {
    const incline = set.inclinePct ?? item.targetInclinePct ?? DEFAULT_INCLINE_PCT;
    return inclineMet(paceOf(set) ?? DEFAULT_WALK_SPEED_M_MIN, incline);
  }

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

  return base;
}

/**
 * Ce que la charge ajoute, en kcal — par-dessus le coût du mouvement lui-même.
 *
 * Le poids n'est pas une intensité, c'est du travail : on le calcule en joules
 * puis on le convertit. Trois façons de déplacer une charge, trois physiques.
 */
function loadCalories(item: EffortItem, set: EffortSet, profile: AthleteProfile): number {
  const load = set.weightKg;
  if (!load || load <= 0) return 0;
  const perMinute = restingKcalPerMinute(profile);
  if (perMinute === null) return 0;

  // Tractée : c'est le frottement du chariot chargé sur la distance parcourue.
  if ((item.equipment ?? []).includes("traineau")) {
    const distance = set.distanceM ?? item.targetDistanceM ?? 0;
    if (distance > 0) {
      const joules = SLED_FRICTION * (SLED_OWN_MASS_KG + load) * GRAVITY * distance;
      return joules / MUSCLE_EFFICIENCY / JOULES_PER_KCAL;
    }
  }

  // Soulevée : le travail d'une répétition, montée et descente, fois le nombre.
  const reps = set.reps ?? parseFirstNumber(item.targetReps);
  if (reps && reps > 0) {
    const range = repRangeOf(item);
    const joules = reps * load * GRAVITY * range * ECCENTRIC_FACTOR;
    return joules / MUSCLE_EFFICIENCY / JOULES_PER_KCAL;
  }

  // Portée ou tenue : ni répétition ni traction, mais un corps alourdi à
  // déplacer. Le coût du déplacement suit la masse totale.
  if (profile.weightKg) {
    const base = item.met ?? DEFAULT_MET[categoryOf(item)];
    const minutes = setEffortSeconds(item, set) / 60;
    return base * perMinute * minutes * (load / profile.weightKg);
  }
  return 0;
}

/**
 * Calories d'une série : l'effort, plus le repos qui la suit. Sert à ventiler
 * la dépense exercice par exercice pendant la séance.
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

  return (
    metOf(item, set, profile) * perMinute * effortMin +
    loadCalories(item, set, profile) +
    REST_MET * perMinute * restMin
  );
}

/** Somme des durées d'effort pur, hors repos, en secondes. */
export function totalEffortSeconds(entries: EffortEntry[]): number {
  return entries
    .filter((e) => e.set.done)
    .reduce((acc, { item, set }) => acc + setEffortSeconds(item, set), 0);
}

/**
 * Calories d'une séance. null si le profil est incomplet.
 *
 * `actualSeconds` est la durée réelle de la séance quand on la connaît : le
 * temps qui n'est pas de l'effort est alors compté en récupération. Sans elle,
 * on retombe sur les repos prévus par le coach, ce qui sous-estime les séances
 * où l'on prend son temps.
 */
export function estimateCalories(
  entries: EffortEntry[],
  profile: AthleteProfile,
  actualSeconds?: number | null,
): number | null {
  if (!isProfileComplete(profile)) return null;

  const done = entries.filter((e) => e.set.done);
  if (done.length === 0) return 0;

  const perMinute = restingKcalPerMinute(profile) ?? 0;

  // L'effort lui-même, au coût propre de chaque exercice.
  let total = 0;
  for (const { item, set } of done) {
    total += (metOf(item, set, profile) * perMinute * setEffortSeconds(item, set)) / 60;
    total += loadCalories(item, set, profile);
  }

  // Tout le reste de la séance : récupération entre les séries et transitions.
  const effortSeconds = totalEffortSeconds(done);
  const sessionSeconds =
    actualSeconds && actualSeconds > effortSeconds
      ? actualSeconds
      : estimateWorkSeconds(done);
  const recoverySeconds = Math.max(0, sessionSeconds - effortSeconds);
  total += (REST_MET * perMinute * recoverySeconds) / 60;

  return Math.round(total);
}

export function formatCalories(value: number): string {
  return `${formatKcal(value)} kcal`;
}

/**
 * Un nombre de calories, lisible.
 *
 * Sous 10 kcal on garde une décimale : une série vaut quelques calories, et
 * l'arrondi à l'entier effacerait justement l'effet d'une charge plus lourde.
 */
export function formatKcal(value: number): string {
  if (value > 0 && value < 10) {
    return value.toLocaleString("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Math.round(value).toLocaleString("fr-FR");
}
