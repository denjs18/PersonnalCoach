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

export const MOODS = [
  { value: 1, emoji: "😵", label: "Cramée" },
  { value: 2, emoji: "😮‍💨", label: "Dur" },
  { value: 3, emoji: "🙂", label: "Ça va" },
  { value: 4, emoji: "😃", label: "Bien" },
  { value: 5, emoji: "🤩", label: "Au top" },
];
