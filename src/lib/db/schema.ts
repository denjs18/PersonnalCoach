import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/* -------------------------------------------------------------------------- */
/*  Bibliothèque d'exercices                                                  */
/* -------------------------------------------------------------------------- */

export const exercises = pgTable(
  "exercises",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    /** echauffement | force | mouvement | duo | core | cardio | mobilite | plyo */
    category: text("category").notNull().default("force"),
    /** haltere, kettlebell, medecine_ball, slam_ball, elastique, poids_du_corps, ... */
    equipment: text("equipment").array().notNull().default([]),
    muscles: text("muscles").array().notNull().default([]),
    description: text("description"),
    /** Déroulé du mouvement, une étape par entrée */
    steps: text("steps").array().notNull().default([]),
    /** Points techniques / erreurs à éviter */
    cues: text("cues"),
    /** reps_weight | reps | time | distance | time_distance */
    tracking: text("tracking").notNull().default("reps_weight"),
    /** true = exercice créé à la main par le coach */
    isCustom: boolean("is_custom").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("exercises_name_unique").on(t.name),
    index("exercises_category_idx").on(t.category),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Séances                                                                    */
/* -------------------------------------------------------------------------- */

export const workouts = pgTable(
  "workouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    /** null uniquement pour les modèles réutilisables */
    scheduledFor: date("scheduled_for"),
    /** draft | published | done */
    status: text("status").notNull().default("draft"),
    isTemplate: boolean("is_template").notNull().default(false),
    focus: text("focus"),
    coachNote: text("coach_note"),
    estimatedMinutes: integer("estimated_minutes"),
    /** 1 (récup) → 5 (très dur) */
    intensity: integer("intensity"),

    publishedAt: timestamp("published_at", { withTimezone: true }),
    startedAt: timestamp("started_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    /** ressenti post-séance de l'athlète */
    athleteRating: integer("athlete_rating"),
    athleteNote: text("athlete_note"),
    durationMinutes: integer("duration_minutes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("workouts_scheduled_idx").on(t.scheduledFor),
    index("workouts_status_idx").on(t.status),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Exercices d'une séance                                                     */
/* -------------------------------------------------------------------------- */

export const workoutItems = pgTable(
  "workout_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    /** echauffement | principal | finisher | retour_au_calme */
    section: text("section").notNull().default("principal"),
    position: integer("position").notNull().default(0),

    sets: integer("sets").notNull().default(3),
    /** texte libre : "10", "10-12", "max" */
    targetReps: text("target_reps"),
    targetWeight: real("target_weight"),
    targetTimeSec: integer("target_time_sec"),
    targetDistanceM: integer("target_distance_m"),
    restSec: integer("rest_sec"),
    note: text("note"),
    /** "A", "B"… pour enchaîner deux exos en superset */
    supersetGroup: text("superset_group"),
    /** surcharge le mode de suivi de l'exercice */
    tracking: text("tracking"),
  },
  (t) => [index("workout_items_workout_idx").on(t.workoutId)],
);

/* -------------------------------------------------------------------------- */
/*  Séries réalisées                                                           */
/* -------------------------------------------------------------------------- */

export const setLogs = pgTable(
  "set_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workoutId: uuid("workout_id")
      .notNull()
      .references(() => workouts.id, { onDelete: "cascade" }),
    workoutItemId: uuid("workout_item_id")
      .notNull()
      .references(() => workoutItems.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    setNumber: integer("set_number").notNull(),
    reps: integer("reps"),
    weightKg: real("weight_kg"),
    timeSec: integer("time_sec"),
    distanceM: integer("distance_m"),
    /** 1→10, difficulté ressentie */
    rpe: integer("rpe"),
    done: boolean("done").notNull().default(false),
    performedOn: date("performed_on"),
    loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("set_logs_item_set_unique").on(t.workoutItemId, t.setNumber),
    index("set_logs_exercise_idx").on(t.exerciseId),
  ],
);

/* -------------------------------------------------------------------------- */
/*  Réglages (nom de l'athlète, objectif de la semaine…)                       */
/* -------------------------------------------------------------------------- */

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutItem = typeof workoutItems.$inferSelect;
export type SetLog = typeof setLogs.$inferSelect;
