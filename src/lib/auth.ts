import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { jwtVerify } from "jose/jwt/verify";
import { SignJWT } from "jose/jwt/sign";
import { SESSION_COOKIE, type Role } from "./auth-shared";

export { SESSION_COOKIE };
export type { Role };

const MAX_AGE_SECONDS = 60 * 60 * 24 * 365; // 1 an : on ne veut pas se reconnecter sans arrêt

export function getSecretKey(): Uint8Array {
  const secret =
    process.env.AUTH_SECRET ??
    (process.env.NODE_ENV === "development" ? "dev-secret-personnal-coach" : undefined);
  if (!secret) {
    throw new Error("AUTH_SECRET manquant : ajoute-le dans les variables d'environnement.");
  }
  return new TextEncoder().encode(secret);
}

function pinFor(role: Role): string {
  const fromEnv = role === "coach" ? process.env.COACH_PIN : process.env.ATHLETE_PIN;
  if (fromEnv && fromEnv.trim()) return fromEnv.trim();
  if (process.env.NODE_ENV === "development") return role === "coach" ? "1234" : "0000";
  return "";
}

export function checkPin(role: Role, pin: string): boolean {
  const expected = pinFor(role);
  if (!expected) return false;
  const given = pin.trim();
  if (given.length !== expected.length) return false;
  // comparaison à temps constant, par principe
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export async function createSession(role: Role) {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export async function verifyToken(token: string): Promise<Role | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const role = payload.role;
    return role === "coach" || role === "athlete" ? role : null;
  } catch {
    return null;
  }
}

export async function getRole(): Promise<Role | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/** À utiliser en tête de page : redirige vers /login si la session manque. */
export async function requireRole(allowed?: Role[]): Promise<Role> {
  const role = await getRole();
  if (!role) redirect("/login");
  if (allowed && !allowed.includes(role)) redirect(role === "coach" ? "/coach" : "/app");
  return role;
}

export async function requireCoach(): Promise<Role> {
  return requireRole(["coach"]);
}
