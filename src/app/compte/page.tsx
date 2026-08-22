import Link from "next/link";
import { ArrowLeft, LogOut, Share, Smartphone, Sparkles, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { logoutAction } from "@/lib/actions/auth";
import { SectionHeading } from "@/components/ui";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function ComptePage() {
  const role = await requireRole();
  const settings = isDbConfigured ? await getSettings() : {};
  const name = settings.athlete_name?.trim();

  return (
    <main className="mx-auto w-full max-w-md px-4 pb-16">
      <header className="sticky top-0 z-30 -mx-4 mb-5 border-b border-line/50 bg-ink/75 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href={role === "coach" ? "/coach" : "/app"}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <h1 className="text-xl font-extrabold">Mon compte</h1>
        </div>
      </header>

      <div className="card mb-6 flex items-center gap-3.5 p-4">
        <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-white">
          {role === "coach" ? <Sparkles className="size-5" /> : <UserRound className="size-5" />}
        </span>
        <div>
          <p className="font-bold">{role === "coach" ? "Coach" : name || "Athlète"}</p>
          <p className="text-[12px] text-faint">
            {role === "coach" ? "Tu prépares les séances" : "Tu suis le programme"}
          </p>
        </div>
      </div>

      <SectionHeading title="Ajouter à l'écran d'accueil" />
      <div className="card space-y-3 p-4 text-[13px] leading-relaxed text-muted">
        <p className="flex items-start gap-2.5">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-brand" />
          <span>
            <strong className="text-fg">iPhone</strong> — Safari →{" "}
            <Share className="inline size-3.5 align-[-2px]" /> Partager →{" "}
            <em>« Sur l'écran d'accueil »</em>.
          </span>
        </p>
        <p className="flex items-start gap-2.5">
          <Smartphone className="mt-0.5 size-4 shrink-0 text-brand-2" />
          <span>
            <strong className="text-fg">Android</strong> — Chrome → menu ⋮ →{" "}
            <em>« Ajouter à l'écran d'accueil »</em>.
          </span>
        </p>
      </div>

      {role === "coach" ? (
        <Link href="/coach/reglages" className="btn-ghost mt-5 w-full">
          Réglages de l'app
        </Link>
      ) : null}

      <form action={logoutAction} className="mt-3">
        <button type="submit" className="btn-ghost w-full text-danger">
          <LogOut className="size-4" />
          Se déconnecter
        </button>
      </form>
    </main>
  );
}
