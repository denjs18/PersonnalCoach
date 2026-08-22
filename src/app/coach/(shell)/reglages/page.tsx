import Link from "next/link";
import { BookOpen, LogOut, Share, Smartphone } from "lucide-react";
import { requireCoach } from "@/lib/auth";
import { getSettings } from "@/lib/queries";
import { getDatabaseStateAction } from "@/lib/actions/database";
import { logoutAction } from "@/lib/actions/auth";
import { TopBar } from "@/components/nav";
import { SectionHeading } from "@/components/ui";
import { SettingsForm } from "@/components/coach/settings-form";
import { DatabaseCard } from "@/components/coach/database-card";

export const dynamic = "force-dynamic";

export default async function ReglagesPage() {
  const role = await requireCoach();
  // Cette page doit rester accessible même si les tables n'existent pas encore :
  // c'est d'ici qu'on installe la base.
  const [settings, dbState] = await Promise.all([getSettings(), getDatabaseStateAction()]);

  return (
    <>
      <TopBar title="Réglages" subtitle="Personnalise l'app" role={role} />

      <SectionHeading title="Son profil" />
      <SettingsForm initial={settings} />

      <div className="mt-7">
        <SectionHeading title="Bibliothèque" />
        <Link href="/coach/exercices" className="card card-hover mb-2.5 flex items-center gap-3 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand">
            <BookOpen className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Gérer les exercices</span>
            <span className="block text-[12px] text-faint">
              {dbState.total} exercices
              {dbState.custom > 0 ? ` · ${dbState.custom} créés par toi` : ""}
            </span>
          </span>
        </Link>
        <DatabaseCard initial={dbState} />
      </div>

      <div className="mt-7">
        <SectionHeading title="Installer sur le téléphone" />
        <div className="card space-y-3 p-4 text-[13px] leading-relaxed text-muted">
          <p className="flex items-start gap-2.5">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-brand" />
            <span>
              <strong className="text-fg">iPhone</strong> — ouvre l'app dans Safari, appuie sur{" "}
              <Share className="inline size-3.5 align-[-2px]" /> Partager, puis{" "}
              <em>« Sur l'écran d'accueil »</em>.
            </span>
          </p>
          <p className="flex items-start gap-2.5">
            <Smartphone className="mt-0.5 size-4 shrink-0 text-brand-2" />
            <span>
              <strong className="text-fg">Android</strong> — dans Chrome, menu ⋮ puis{" "}
              <em>« Ajouter à l'écran d'accueil »</em>.
            </span>
          </p>
          <p className="text-[12px] text-faint">
            L'app s'ouvre alors en plein écran, comme une vraie application.
          </p>
        </div>
      </div>

      <form action={logoutAction} className="mt-7">
        <button type="submit" className="btn-ghost w-full text-danger">
          <LogOut className="size-4" />
          Se déconnecter
        </button>
      </form>
    </>
  );
}
