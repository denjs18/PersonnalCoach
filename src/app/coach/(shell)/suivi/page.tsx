import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Flame,
  Layers,
  LineChart,
  MessageCircle,
  Target,
  Trophy,
} from "lucide-react";
import { requireCoach } from "@/lib/auth";
import {
  getCompletedWorkouts,
  getExerciseProgress,
  getProgression,
  getStats,
  getTrackedExercises,
} from "@/lib/queries";
import { TopBar } from "@/components/nav";
import {
  CategoryRanks,
  LevelCard,
  UpcomingBadges,
  neglectedCategory,
} from "@/components/progression";
import { CategoryBadge, EmptyState, SectionHeading, StatCard } from "@/components/ui";
import { Sparkline } from "@/components/progress-chart";
import { buildSeries, formatDelta } from "@/lib/progress";
import { MOODS } from "@/lib/constants";
import { formatDuration, formatShortDate, pluralize } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SuiviPage() {
  const role = await requireCoach();
  const [sessions, tracked, stats, progression] = await Promise.all([
    getCompletedWorkouts(20),
    getTrackedExercises(),
    getStats(),
    getProgression(),
  ]);

  const series = await Promise.all(
    tracked.slice(0, 25).map(async (row) => {
      const progress = await getExerciseProgress(row.exercise.id);
      return { ...row, series: buildSeries(row.exercise.tracking, progress?.points ?? []) };
    }),
  );

  const withFeedback = sessions.filter((s) => s.athleteNote || s.athleteRating);
  const earnedBadges = progression.badges.filter((b) => b.earned).length;
  const neglected = neglectedCategory(progression.categories);

  return (
    <>
      <TopBar title="Suivi" subtitle="Ce qu'elle a réellement fait" role={role} />

      {progression.stats.sessions > 0 ? (
        <div className="mb-4">
          <Link href="/app/niveaux" className="block transition active:scale-[0.99]">
            <LevelCard level={progression.level} compact />
          </Link>
        </div>
      ) : null}

      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <StatCard label="Séances" value={stats.totalSessions} accent="brand" />
        <StatCard
          label="Semaine"
          value={stats.sessionsThisWeek}
          suffix="faites"
          accent="energy"
        />
        {stats.totalCalories !== null ? (
          <StatCard
            label="Calories"
            value={
              stats.totalCalories >= 10000
                ? `${(stats.totalCalories / 1000).toFixed(1).replace(".", ",")}k`
                : stats.totalCalories
            }
            suffix="kcal"
            accent="violet"
            hint="estimation"
          />
        ) : (
          <StatCard
            label="Volume"
            value={
              stats.totalVolumeKg >= 1000
                ? (stats.totalVolumeKg / 1000).toFixed(1).replace(".", ",")
                : stats.totalVolumeKg
            }
            suffix={stats.totalVolumeKg >= 1000 ? "t" : "kg"}
            accent="violet"
          />
        )}
      </div>

      {withFeedback.length > 0 ? (
        <section className="mb-7">
          <SectionHeading title="Ses retours" icon={<MessageCircle className="size-3.5" />} />
          <div className="space-y-2.5">
            {withFeedback.slice(0, 5).map((session) => {
              const mood = MOODS.find((m) => m.value === session.athleteRating);
              return (
                <div key={session.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-lg">
                      {mood?.emoji ?? "✅"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{session.title}</p>
                      <p className="text-[11.5px] text-faint">
                        {session.scheduledFor ? formatShortDate(session.scheduledFor) : ""}
                        {mood ? ` · ${mood.label}` : ""}
                        {session.durationMinutes
                          ? ` · ${formatDuration(session.durationMinutes * 60)}`
                          : ""}
                      </p>
                      {session.athleteNote ? (
                        <p className="mt-2 rounded-lg border-l-2 border-brand/60 bg-surface-2/60 py-1.5 pl-2.5 pr-2 text-[12.5px] italic text-fg/85">
                          « {session.athleteNote} »
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mb-7">
        <SectionHeading title="Séances terminées" />
        {sessions.length === 0 ? (
          <EmptyState
            icon={<LineChart className="size-6" />}
            title="Rien de terminé pour l'instant"
            description="Dès qu'elle valide une séance, ses performances apparaissent ici."
          />
        ) : (
          <div className="space-y-2.5">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/seance/${session.id}`}
                className="card card-hover flex items-center gap-3 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">
                    {session.scheduledFor ? formatShortDate(session.scheduledFor) : "—"}
                  </p>
                  <p className="truncate font-semibold">{session.title}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="chip">
                      <Layers className="size-3.5" />
                      {pluralize(session.loggedSets, "série")}
                    </span>
                    {session.durationMinutes ? (
                      <span className="chip">
                        <Clock className="size-3.5" />
                        {formatDuration(session.durationMinutes * 60)}
                      </span>
                    ) : null}
                    {session.calories ? (
                      <span className="chip border-warn/35 text-warn">
                        <Flame className="size-3.5" />~{session.calories} kcal
                      </span>
                    ) : null}
                  </div>
                </div>
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </Link>
            ))}
          </div>
        )}
      </section>

      {progression.stats.sessions > 0 ? (
        <>
          <section className="mb-7">
            <SectionHeading
              title="Ce qu'elle travaille"
              icon={<Target className="size-3.5" />}
              action={
                <Link href="/app/niveaux" className="text-xs font-semibold text-brand">
                  Tout voir
                </Link>
              }
            />
            {neglected ? (
              <p className="mb-2.5 rounded-xl border border-warn/30 bg-warn/10 p-2.5 text-[12.5px] leading-relaxed text-warn">
                <strong>{neglected.label}</strong>{" "}
                {neglected.sets === 0
                  ? "n'a jamais été travaillé"
                  : `est nettement en retard (${neglected.sets} série${neglected.sets > 1 ? "s" : ""})`}
                . À glisser dans une prochaine séance ?
              </p>
            ) : null}
            <CategoryRanks categories={progression.categories} />
          </section>

          <section className="mb-7">
            <SectionHeading
              title={`Trophées · ${earnedBadges}/${progression.badges.length}`}
              icon={<Trophy className="size-3.5" />}
            />
            <p className="mb-2.5 text-[12px] leading-relaxed text-faint">
              Les plus proches d'être débloqués — de quoi lui donner un objectif concret.
            </p>
            <UpcomingBadges badges={progression.badges} />
          </section>
        </>
      ) : null}

      {series.length > 0 ? (
        <section className="mb-7">
          <SectionHeading title="Progression par exercice" />
          <div className="space-y-2">
            {series.map((row) => (
              <Link
                key={row.exercise.id}
                href={`/app/progression/${row.exercise.id}`}
                className="card card-hover flex items-center gap-3 p-3.5"
              >
                <div className="min-w-0 flex-1">
                  <CategoryBadge category={row.exercise.category} />
                  <p className="mt-1 truncate font-semibold leading-snug">{row.exercise.name}</p>
                  <p className="text-[11.5px] text-faint">
                    {pluralize(row.sessions, "séance")}
                    {row.lastDate ? ` · ${formatShortDate(row.lastDate)}` : ""}
                  </p>
                </div>
                <div className="w-20 shrink-0 text-right">
                  {row.series.delta === null ? (
                    <span className="text-[11px] font-semibold text-faint">
                      1<sup>re</sup> séance
                    </span>
                  ) : (
                    <>
                      <Sparkline values={row.series.values} tone="energy" />
                      <span className="text-[11px] font-bold tabular-nums text-energy">
                        {formatDelta(row.series.delta)} {row.series.unit}
                      </span>
                    </>
                  )}
                </div>
                <ChevronRight className="size-4 shrink-0 text-faint" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
