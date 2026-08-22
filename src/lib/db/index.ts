import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";
import { isNeonUrl, sslOptionsFor } from "./connection";

const connectionString = process.env.DATABASE_URL;

export const isDbConfigured = Boolean(connectionString);

export type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

/** En dev, Next recharge les modules à chaud : on garde le pool sur globalThis. */
const globalForDb = globalThis as unknown as { __pcPool?: Pool; __pcDb?: Database };

function build(url: string): Database {
  if (isNeonUrl(url)) {
    return drizzleNeon(neon(url), { schema });
  }
  const pool =
    globalForDb.__pcPool ??
    new Pool({ connectionString: url, ssl: sslOptionsFor(url), max: 5 });
  if (process.env.NODE_ENV !== "production") globalForDb.__pcPool = pool;
  return drizzlePg(pool, { schema }) as unknown as Database;
}

/**
 * Instancié à la première requête : l'app peut ainsi démarrer et afficher
 * l'écran d'installation même sans DATABASE_URL.
 */
export function getDb(): Database {
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL manquant. Ajoute-le dans .env.local (voir .env.example) puis relance.",
    );
  }
  if (!globalForDb.__pcDb) globalForDb.__pcDb = build(connectionString);
  return globalForDb.__pcDb;
}

export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export * from "./schema";
