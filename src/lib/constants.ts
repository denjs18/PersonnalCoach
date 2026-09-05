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
  // Rameur : les paliers suivent la puissance développée (P ≈ 2,8 / allure³),
  // 190 m/min ≈ 2:38 au 500 m ≈ 90 W.
  rameur: [
    [150, 4],
    [170, 5],
    [195, 6.5],
    [215, 8],
    [235, 10],
    [Infinity, 12],
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
