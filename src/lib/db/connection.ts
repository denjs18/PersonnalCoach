import type { PoolConfig } from "pg";

/**
 * Neon expose un endpoint HTTP très rapide en serverless ; pour tout autre
 * hébergeur Postgres on retombe sur le driver TCP classique. L'app reste ainsi
 * utilisable avec n'importe quel Postgres (Neon, Railway, Postgres local…).
 */
export function isNeonUrl(url: string): boolean {
  return /\.neon\.(tech|build)/i.test(url);
}

/** Traduit `sslmode=` de l'URL en options TLS node-postgres, à la façon de libpq. */
export function sslOptionsFor(url: string): PoolConfig["ssl"] {
  const mode = /[?&]sslmode=([a-z-]+)/i.exec(url)?.[1]?.toLowerCase();
  switch (mode) {
    case "verify-full":
    case "verify-ca":
      return { rejectUnauthorized: true };
    case "require":
    case "prefer":
      // `require` chiffre la connexion sans valider le certificat : c'est la
      // sémantique de libpq, et celle qu'attendent la plupart des hébergeurs.
      return { rejectUnauthorized: false };
    default:
      return undefined;
  }
}
