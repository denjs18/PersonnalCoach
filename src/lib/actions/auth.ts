"use server";

import { redirect } from "next/navigation";
import { checkPin, createSession, destroySession, type Role } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const role = String(formData.get("role") ?? "") as Role;
  const pin = String(formData.get("pin") ?? "");
  const next = String(formData.get("next") ?? "");

  if (role !== "coach" && role !== "athlete") {
    return { error: "Profil inconnu." };
  }
  if (!pin.trim()) {
    return { error: "Entre ton code." };
  }
  if (!checkPin(role, pin)) {
    return { error: "Code incorrect. Réessaie." };
  }

  await createSession(role);
  const fallback = role === "coach" ? "/coach" : "/app";
  redirect(next && next.startsWith("/") && next !== "/" ? next : fallback);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
