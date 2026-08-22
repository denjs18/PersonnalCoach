import Link from "next/link";
import { ChevronRight, LineChart, TrendingDown, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getExerciseProgress, getStats, getTrackedExercises } from "@/lib/queries";
import { buildSeries, formatDelta } from "@/lib/progress";
import { TopBar } from "@/components/nav";
import { CategoryBadge, EmptyState, StatCard } from "@/components/ui";
import { Sparkline } from "@/components/progress-chart";
import { formatShortDate, pluralize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProgressionPage() {
  const role = await requireRole();
  const [tracked, stats] = await Promise.all([getTrackedExercises(), getStats()]);

  const rows = await Promise.all(
    tracked.slice(0, 40).map(async (row) => {
      const progress = await getExerciseProgress(row.exercise.id);
      return { ...row, series: buildSeries(row.exercise.tracking, progress?.points ?? []) };
    }),
  );

  return (
    <>
      <TopBar title="Ma progression" subtitle="Ce que tu gagnes, séance après séance" role={role} />

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Série" value={stats.weekStreak} suffix="sem." accent="brand" />
        <StatCard label="Exercices" value={tracked.length} suffix="suivis" accent="cyan" />
        <StatCard
          label="Volume total"
          value={
            stats.totalVolumeKg >= 1000
              ? (stats.totalVolumeKg / 1000).toFixed(1).replace(".", ",")
              : stats.totalVolumeKg
          }
          suffix={stats.totalVolumeKg >= 1000 ? "t" : "kg"}
          accent="violet"
        />
      </div>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<LineChart className="size-6" />}
            title="Pas encore de données"
            description="Note tes poids et tes répétitions pendant les séances : la progression apparaîtra ici automatiquement."
            action={
              <Link href="/app" className="btn-primary">
                Voir mes séances
              </Link>
            }
          />
        </div>
      ) : (
        <section className="mt-6 space-y-2.5">
          {rows.map(({ exercise, sessions, lastDate, series }) => (
            <Link
              key={exercise.id}
              href={`/app/progression/${exercise.id}`}
              className="card card-hover block p-4"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <CategoryBadge category={exercise.category} />
                  <h3 className="mt-1.5 truncate font-bold leading-snug">{exercise.name}</h3>
                  <p className="text-[11.5px] text-faint">
                    {pluralize(sessions, "séance")}
                    {lastDate ? ` · dernière le ${formatShortDate(lastDate)}` : ""}
                  </p>
                </div>

                <div className="w-24 shrink-0 text-right">
                  {series.delta === null ? (
                    <p className="text-[11px] font-semibold text-faint">1<sup>re</sup> séance</p>
                  ) : (
                    <>
                      <Sparkline
                        values={series.values}
                        tone={series.delta >= 0 ? "energy" : "brand"}
                      />
                      <p
                        className={`mt-0.5 flex items-center justify-end gap-1 text-[11px] font-bold tabular-nums ${
                          series.delta > 0
                            ? "text-energy"
                            : series.delta < 0
                              ? "text-muted"
                              : "text-faint"
                        }`}
                      >
                        {series.delta > 0 ? <TrendingUp className="size-3" /> : null}
                        {series.delta < 0 ? <TrendingDown className="size-3" /> : null}
                        {formatDelta(series.delta)} {series.unit}
                      </p>
                    </>
                  )}
                </div>
                <ChevronRight className="mt-6 size-4 shrink-0 text-faint" />
              </div>
            </Link>
          ))}
        </section>
      )}
    </>
  );
}
