import Link from "next/link";
import { Sparkles, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getProgression, getSettings } from "@/lib/queries";
import { TopBar } from "@/components/nav";
import { EmptyState, StatCard } from "@/components/ui";
import { BadgeGrid, CategoryRanks, LevelCard } from "@/components/progression";
import { formatRelativeDay, pluralize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NiveauxPage() {
  const role = await requireRole();
  const [progression, settings] = await Promise.all([getProgression(), getSettings()]);
  const { stats, level, categories, badges, recentSessions, xp } = progression;

  const earned = badges.filter((b) => b.earned);
  const name = settings.athlete_name?.trim();

  if (stats.sessions === 0) {
    return (
      <>
        <TopBar title="Progression" subtitle="Niveaux et accomplissements" role={role} />
        <EmptyState
          icon={<Trophy className="size-6" />}
          title="Ta progression démarre à la première séance"
          description="Niveaux, rangs par famille d'exercices et accomplissements se débloquent au fur et à mesure."
          action={
            <Link href="/app" className="btn-primary">
              Voir mes séances
            </Link>
          }
        />
      </>
    );
  }

  return (
    <>
      <TopBar
        title={name ? `Progression de ${name}` : "Ma progression"}
        subtitle={`${xp.toLocaleString("fr-FR")} points cumulés`}
        role={role}
      />

      <LevelCard level={level} />

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatCard label="Trophées" value={`${earned.length}`} suffix={`/${badges.length}`} accent="energy" />
        <StatCard label="Séries" value={stats.totalSets} accent="cyan" />
        <StatCard
          label="Série en cours"
          value={stats.weekStreak}
          suffix="sem."
          accent="brand"
          hint={stats.bestWeekStreak > stats.weekStreak ? `record : ${stats.bestWeekStreak}` : undefined}
        />
      </div>

      {recentSessions.length > 0 ? (
        <section className="mt-6">
          <h2 className="section-title mb-2.5">Points des dernières séances</h2>
          <div className="card divide-y divide-line/60">
            {recentSessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] font-semibold">{s.title}</p>
                  {s.date ? (
                    <p className="text-[11px] text-faint">{formatRelativeDay(s.date)}</p>
                  ) : null}
                </div>
                <span className="shrink-0 text-sm font-extrabold tabular-nums text-brand">
                  +{s.xp}
                </span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section className="mt-7">
        <h2 className="section-title mb-2.5 flex items-center gap-1.5">
          <Sparkles className="size-3.5" />
          Rangs par famille d'exercices
        </h2>
        <p className="mb-3 text-[12px] leading-relaxed text-faint">
          Chaque famille monte en rang avec les séries réalisées. Un coup d'œil suffit pour voir
          ce qui est bien travaillé et ce qui manque.
        </p>
        <CategoryRanks categories={categories} />
      </section>

      <section className="mt-8">
        <h2 className="section-title mb-3 flex items-center gap-1.5">
          <Trophy className="size-3.5" />
          Accomplissements · {pluralize(earned.length, "débloqué", "débloqués")}
        </h2>
        <BadgeGrid badges={badges} />
      </section>
    </>
  );
}
