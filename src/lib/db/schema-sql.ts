/**
 * Schéma de la base, source unique de vérité.
 *
 * Écrit sous forme d'instructions séparées et idempotentes : elles peuvent être
 * rejouées sans risque, aussi bien par `npm run db:setup` que par le bouton
 * « Installer la base » de l'espace coach (qui n'a pas accès au disque).
 */
export const SCHEMA_STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  `CREATE TABLE IF NOT EXISTS exercises (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name         text NOT NULL,
    category     text NOT NULL DEFAULT 'force',
    equipment    text[] NOT NULL DEFAULT '{}',
    muscles      text[] NOT NULL DEFAULT '{}',
    description  text,
    cues         text,
    tracking     text NOT NULL DEFAULT 'reps_weight',
    is_custom    boolean NOT NULL DEFAULT false,
    is_archived  boolean NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS exercises_name_unique ON exercises (name)`,
  `CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises (category)`,

  `CREATE TABLE IF NOT EXISTS workouts (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title             text NOT NULL,
    scheduled_for     date,
    status            text NOT NULL DEFAULT 'draft',
    is_template       boolean NOT NULL DEFAULT false,
    focus             text,
    coach_note        text,
    estimated_minutes integer,
    intensity         integer,
    published_at      timestamptz,
    started_at        timestamptz,
    completed_at      timestamptz,
    athlete_rating    integer,
    athlete_note      text,
    duration_minutes  integer,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS workouts_scheduled_idx ON workouts (scheduled_for)`,
  `CREATE INDEX IF NOT EXISTS workouts_status_idx ON workouts (status)`,

  `CREATE TABLE IF NOT EXISTS workout_items (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id        uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    exercise_id       uuid NOT NULL REFERENCES exercises(id) ON DELETE RESTRICT,
    section           text NOT NULL DEFAULT 'principal',
    position          integer NOT NULL DEFAULT 0,
    sets              integer NOT NULL DEFAULT 3,
    target_reps       text,
    target_weight     real,
    target_time_sec   integer,
    target_distance_m integer,
    rest_sec          integer,
    note              text,
    superset_group    text,
    tracking          text
  )`,

  `CREATE INDEX IF NOT EXISTS workout_items_workout_idx ON workout_items (workout_id)`,

  `CREATE TABLE IF NOT EXISTS set_logs (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    workout_id      uuid NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
    workout_item_id uuid NOT NULL REFERENCES workout_items(id) ON DELETE CASCADE,
    exercise_id     uuid NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    set_number      integer NOT NULL,
    reps            integer,
    weight_kg       real,
    time_sec        integer,
    distance_m      integer,
    rpe             integer,
    done            boolean NOT NULL DEFAULT false,
    performed_on    date,
    logged_at       timestamptz NOT NULL DEFAULT now()
  )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS set_logs_item_set_unique ON set_logs (workout_item_id, set_number)`,
  `CREATE INDEX IF NOT EXISTS set_logs_exercise_idx ON set_logs (exercise_id)`,

  `CREATE TABLE IF NOT EXISTS settings (
    key   text PRIMARY KEY,
    value text NOT NULL
  )`,
];

/** Ordre inverse des dépendances, pour `npm run db:reset`. */
export const DROP_STATEMENT =
  "DROP TABLE IF EXISTS set_logs, workout_items, workouts, exercises, settings CASCADE";
