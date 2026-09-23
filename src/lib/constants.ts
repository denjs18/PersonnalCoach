export const CATEGORIES = {
  echauffement: { label: "Échauffement", emoji: "🔥", color: "#FF9F45" },
  force: { label: "Force", emoji: "💪", color: "#FF4D8D" },
  mouvement: { label: "Mouvement", emoji: "🌀", color: "#8B5CF6" },
  duo: { label: "À deux", emoji: "🤝", color: "#22D3EE" },
  core: { label: "Gainage", emoji: "🎯", color: "#F472B6" },
  cardio: { label: "Cardio", emoji: "⚡", color: "#FBBF24" },
  plyo: { label: "Explosivité", emoji: "🚀", color: "#34D399" },
  mobilite: { label: "Mobilité", emoji: "🧘", color: "#94A3B8" },
} as const;

export type CategoryKey = keyof typeof CATEGORIES;
export const CATEGORY_KEYS = Object.keys(CATEGORIES) as CategoryKey[];

export const EQUIPMENT = {
  poids_du_corps: "Poids du corps",
  haltere: "Haltères",
  kettlebell: "Kettlebell",
  medecine_ball: "Médecine ball",
  slam_ball: "Slam ball",
  sac_leste: "Sac lesté",
  gilet_leste: "Gilet lesté",
  elastique: "Élastique",
  barre: "Barre",
  disque: "Disque",
  traineau: "Traîneau / chariot",
  rameur: "Rameur",
  ski_erg: "Ski erg",
  velo: "Vélo",
  corde_a_sauter: "Corde à sauter",
  corde_ondulatoire: "Battle rope",
  trx: "TRX / sangles",
  banc: "Banc",
  step: "Step",
  box: "Box",
  swiss_ball: "Swiss ball",
  bosu: "Bosu",
  roue_abdos: "Roue abdos",
  tapis: "Tapis",
  partenaire: "Partenaire",
  aucun: "Sans matériel",
} as const;

export type EquipmentKey = keyof typeof EQUIPMENT;
export const EQUIPMENT_KEYS = Object.keys(EQUIPMENT) as EquipmentKey[];

export const SECTIONS = {
  echauffement: { label: "Échauffement", emoji: "🔥" },
  principal: { label: "Bloc principal", emoji: "💥" },
  finisher: { label: "Finisher", emoji: "🏁" },
  retour_au_calme: { label: "Retour au calme", emoji: "🌙" },
} as const;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/** Ce qu'on demande à l'athlète de noter pour chaque série. */
export const TRACKING = {
  reps_weight: { label: "Répétitions + poids", short: "Reps × kg" },
  reps: { label: "Répétitions seules", short: "Reps" },
  time: { label: "Durée", short: "Temps" },
  distance: { label: "Distance", short: "Distance" },
  distance_weight: { label: "Distance + charge", short: "Dist. × kg" },
  time_distance: { label: "Durée + distance", short: "Temps + dist." },
} as const;

export type TrackingKey = keyof typeof TRACKING;
export const TRACKING_KEYS = Object.keys(TRACKING) as TrackingKey[];

export const INTENSITY = [
  { value: 1, label: "Récup", emoji: "🌿" },
  { value: 2, label: "Léger", emoji: "🙂" },
  { value: 3, label: "Soutenu", emoji: "😅" },
  { value: 4, label: "Dur", emoji: "🥵" },
  { value: 5, label: "Very hard", emoji: "🔥" },
];

/**
 * Coût énergétique par défaut de chaque famille d'exercices, en MET
 * (1 MET = dépense au repos). Valeurs approchées du Compendium of Physical
 * Activities. Un exercice peut surcharger la valeur de sa catégorie.
 */
export const DEFAULT_MET: Record<CategoryKey, number> = {
  echauffement: 4,
  force: 5,
  mouvement: 5.5,
  duo: 5.5,
  core: 3.8,
  cardio: 8.5,
  plyo: 8,
  mobilite: 2.3,
};

/* ---------------------------- Travail mécanique --------------------------- */

/**
 * Ce que coûte réellement une charge.
 *
 * Plutôt qu'un coefficient choisi à la main, on calcule le travail physique :
 * masse × gravité × déplacement. Ça donne le bon comportement de lui-même —
 * 5 kg d'haltères sur une fente ne pèsent presque rien face aux 84 kg de corps
 * déjà déplacés, alors que 40 kg au soulevé de terre, c'est tout l'exercice.
 */
export const GRAVITY = 9.81;
export const JOULES_PER_KCAL = 4184;

/** Rendement du muscle : environ un cinquième du travail produit est mécanique. */
export const MUSCLE_EFFICIENCY = 0.22;

/**
 * La descente coûte aussi, sans produire de travail positif : on compte la
 * phase excentrique pour environ un tiers de la montée.
 */
export const ECCENTRIC_FACTOR = 1.3;

/** Hauteur typique parcourue par la charge sur une répétition, en mètres. */
export const REP_RANGE_M: Record<CategoryKey, number> = {
  echauffement: 0.4,
  force: 0.45,
  mouvement: 0.4,
  duo: 0.4,
  core: 0.3,
  cardio: 0.4,
  plyo: 0.4,
  mobilite: 0.3,
};

/** Traîneau : c'est le frottement au sol qui coûte, pas une montée. */
export const SLED_FRICTION = 0.4;
/** Masse du chariot à vide, à ajouter à la charge posée dessus (kg). */
export const SLED_OWN_MASS_KG = 30;

/**
 * Pente retenue quand personne ne l'a précisée, en pourcentage.
 * Un exercice déclaré « en pente » n'a de sens qu'incliné : à défaut d'un
 * chiffre, on suppose une pente franche plutôt qu'un tapis à plat. 12 %, c'est
 * l'inclinaison des marches en côte classiques en salle.
 */
export const DEFAULT_INCLINE_PCT = 12;

/**
 * Allure de marche supposée quand la distance n'a pas été notée (m/min).
 * 75 m/min ≈ 4,5 km/h, l'allure d'une marche soutenue sur tapis.
 */
export const DEFAULT_WALK_SPEED_M_MIN = 75;

/** Au-delà de cette allure on ne marche plus, on court (134 m/min ≈ 8 km/h). */
export const RUNNING_THRESHOLD_M_MIN = 134;

/**
 * Niveaux d'effort proposés au coach quand il crée un exercice, avec le MET
 * correspondant. Personne ne connaît ses MET par cœur : on décrit la sensation,
 * et c'est la valeur qui sert au calcul des calories.
 */
export const EFFORT_LEVELS = [
  { met: 2.5, label: "Très léger", hint: "Mobilité, étirements, respiration" },
  { met: 4, label: "Léger", hint: "Échauffement tranquille, on parle sans gêne" },
  { met: 5.5, label: "Modéré", hint: "Ça chauffe, la conversation devient hachée" },
  { met: 7, label: "Soutenu", hint: "Essoufflée, quelques mots à la fois" },
  { met: 8.5, label: "Intense", hint: "Dur à tenir, on ne parle plus" },
  { met: 10, label: "Maximal", hint: "Sprint, traîneau lourd, on lâche tout" },
] as const;

/** Le niveau le plus proche d'un MET donné, pour présélectionner le bouton. */
export function nearestEffortLevel(met: number): number {
  let best: number = EFFORT_LEVELS[0].met;
  for (const level of EFFORT_LEVELS) {
    if (Math.abs(level.met - met) < Math.abs(best - met)) best = level.met;
  }
  return best;
}

/**
 * Coût pendant les temps de repos entre les séries. Ce n'est pas du repos
 * assis : on récupère d'un effort, le cœur et la respiration redescendent
 * lentement. Les mesures de dépense en récupération donnent 2,5 à 3,5 MET.
 */
export const REST_MET = 2.8;

/**
 * Au-delà, on considère que la séance a été interrompue (téléphone posé,
 * discussion, sortie de la salle) et on ne compte pas tout l'intervalle.
 */
export const MAX_GAP_SECONDS = 600;

/** Mise en place, changement de charge, déplacement entre deux exercices. */
export const TRANSITION_SECONDS = 45;

/**
 * Un MET vaut la dépense au repos *assis*, environ 15 % au-dessus du
 * métabolisme basal que donne la formule de Mifflin-St Jeor (mesuré couché,
 * à jeun). Sans cette correction, l'estimation est systématiquement trop basse.
 */
export const RESTING_OVER_BASAL = 1.15;

/**
 * Sur un rameur, un vélo ou en course, le coût dépend surtout de l'allure :
 * 10 minutes tranquilles et 10 minutes à fond n'ont rien à voir. Quand la
 * distance et la durée sont notées toutes les deux, on déduit le MET de la
 * vitesse (en mètres par minute) plutôt que d'utiliser celui de l'exercice.
 */
export const PACE_MET: Record<string, Array<[maxMetersPerMinute: number, met: number]>> = {
  /*
   * Rameur. Les paliers suivent la puissance développée, reliée à l'allure par
   * la loi du frein à air P ≈ 2,8 / allure³ — vérifiée sur l'écran de la salle,
   * qui affiche bien 79 W à 2:44 au 500 m.
   *
   * Les bornes tombent sur les trois allures mesurées du Compendium : 100 W
   * vaut 7 MET, 150 W en vaut 8,5 et 200 W en vaut 12. Entre les deux on
   * interpole ; au-dessous de 100 W on descend vers l'effort d'échauffement.
   *
   * À ne pas caler sur le compteur des machines : elles appliquent toutes
   * kcal/h = 4 × watts + 300, un forfait de 300 kcal/h identique pour tout le
   * monde, sans tenir compte du poids ni du sexe. Ce forfait vaut à lui seul
   * 5 kcal/min, quand le métabolisme de repos réel tourne autour de 1,3.
   */
  rameur: [
    [160, 4.5],
    [180, 5.5],
    [198, 6.8],
    [213, 7.7],
    [227, 8.5],
    [250, 10.5],
    [Infinity, 12.5],
  ],
  // Vélo : paliers classiques, de 15 à 30 km/h.
  velo: [
    [250, 4],
    [330, 6],
    [415, 8],
    [500, 10],
    [Infinity, 12],
  ],
  // Marche puis course, de 5 à plus de 11 km/h.
  course: [
    [90, 3.5],
    [107, 6],
    [134, 8.3],
    [161, 9.8],
    [188, 11],
    [Infinity, 12.8],
  ],
};

/** Durée moyenne d'une répétition, selon la famille d'exercices (secondes). */
export const SECONDS_PER_REP: Record<CategoryKey, number> = {
  echauffement: 2.5,
  force: 3.5,
  mouvement: 3,
  duo: 3,
  core: 3,
  cardio: 2,
  plyo: 2.5,
  mobilite: 4,
};

export const SEXES = [
  { value: "femme", label: "Femme" },
  { value: "homme", label: "Homme" },
] as const;

export const MOODS = [
  { value: 1, emoji: "😵", label: "Cramée" },
  { value: 2, emoji: "😮‍💨", label: "Dur" },
  { value: 3, emoji: "🙂", label: "Ça va" },
  { value: 4, emoji: "😃", label: "Bien" },
  { value: 5, emoji: "🤩", label: "Au top" },
];
