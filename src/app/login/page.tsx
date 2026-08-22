import { redirect } from "next/navigation";
import { getRole } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { isDbConfigured } from "@/lib/db";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const role = await getRole();
  if (role) redirect(role === "coach" ? "/coach" : "/app");

  const { next } = await searchParams;

  let athleteName = "";
  if (isDbConfigured) {
    try {
      athleteName = (await getSettings()).athlete_name ?? "";
    } catch {
      athleteName = "";
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-10">
      <div className="mb-9 text-center">
        <div className="mx-auto mb-5 grid size-16 place-items-center rounded-[1.4rem] bg-gradient-to-br from-brand to-brand-2 text-3xl shadow-[0_16px_50px_-18px_var(--color-brand)]">
          💪
        </div>
        <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight">
          <span className="gradient-text">Ton programme</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          Les séances préparées pour toi, séance après séance.
        </p>
      </div>

      <LoginForm next={next} athleteName={athleteName} />

      {!isDbConfigured ? (
        <p className="mt-6 rounded-xl border border-warn/30 bg-warn/10 p-3 text-center text-xs text-warn">
          La base de données n'est pas encore branchée — voir <code>README.md</code>.
        </p>
      ) : null}
    </main>
  );
}
