/**
 * Crée les tables (idempotent) puis remplit la bibliothèque d'exercices.
 *
 *   npm run db:setup      -> tables + bibliothèque
 *   npm run db:seed       -> bibliothèque uniquement
 *   npm run db:reset      -> SUPPRIME tout puis recrée (attention !)
 *
 * Pas de terminal sous la main ? L'espace coach propose le même bouton dans
 * Réglages → Base de données.
 */
import { neon } from "@neondatabase/serverless";
import { Pool } from "pg";
import { config } from "dotenv";
import { EXERCISE_LIBRARY } from "../src/lib/exercise-library";
import { isNeonUrl, sslOptionsFor } from "../src/lib/db/connection";
import { DROP_STATEMENT, SCHEMA_STATEMENTS } from "../src/lib/db/schema-sql";

config({ path: ".env.local", quiet: true });
config({ path: ".env", quiet: true });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "\n❌  DATABASE_URL manquant.\n" +
      "   Crée un fichier .env.local à la racine avec ton URL Postgres.\n" +
      "   Modèle disponible dans .env.example\n",
  );
  process.exit(1);
}

/** Même logique que l'app : HTTP chez Neon, TCP partout ailleurs. */
type RawClient = {
  query: (text: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  close: () => Promise<void>;
};

function createClient(connectionString: string): RawClient {
  if (isNeonUrl(connectionString)) {
    const neonSql = neon(connectionString);
    return {
      query: (text, params) =>
        neonSql.query(text, params as unknown[]) as Promise<Record<string, unknown>[]>,
      close: async () => {},
    };
  }
  const pool = new Pool({ connectionString, ssl: sslOptionsFor(connectionString), max: 2 });
  return {
    query: async (text, params) => (await pool.query(text, params as unknown[])).rows,
    close: () => pool.end(),
  };
}

const sql = createClient(url);
const args = process.argv.slice(2);
const seedOnly = args.includes("--seed-only");
const reset = args.includes("--reset");

async function run() {
  if (reset) {
    console.log("🗑️   Suppression des tables existantes…");
    await sql.query(DROP_STATEMENT);
  }

  if (!seedOnly) {
    console.log("📐  Création des tables…");
    for (const statement of SCHEMA_STATEMENTS) {
      await sql.query(statement);
    }
    console.log("✅  Tables prêtes.");
  }

  console.log(`📚  Bibliothèque : ${EXERCISE_LIBRARY.length} exercices à synchroniser…`);
  let created = 0;
  let updated = 0;

  for (const ex of EXERCISE_LIBRARY) {
    const rows = (await sql.query(
      `INSERT INTO exercises (name, category, equipment, muscles, description, cues, tracking, is_custom)
       VALUES ($1, $2, $3, $4, $5, $6, $7, false)
       ON CONFLICT (name) DO UPDATE SET
         category = EXCLUDED.category,
         equipment = EXCLUDED.equipment,
         muscles = EXCLUDED.muscles,
         description = EXCLUDED.description,
         cues = EXCLUDED.cues,
         tracking = EXCLUDED.tracking
       WHERE exercises.is_custom = false
       RETURNING (xmax = 0) AS inserted`,
      [ex.name, ex.category, ex.equipment, ex.muscles, ex.description, ex.cues, ex.tracking],
    )) as Array<{ inserted: boolean }>;

    if (rows[0]?.inserted) created++;
    else updated++;
  }

  console.log(`✅  ${created} exercices ajoutés, ${updated} mis à jour.`);

  const [{ count }] = (await sql.query(
    "SELECT count(*)::int AS count FROM exercises",
  )) as Array<{ count: number }>;
  console.log(`\n🏁  Terminé — ${count} exercices disponibles dans l'app.\n`);
}

run()
  .then(() => sql.close())
  .catch(async (err) => {
    console.error("\n❌  Échec :", err instanceof Error ? err.message : err, "\n");
    await sql.close().catch(() => {});
    process.exit(1);
  });
