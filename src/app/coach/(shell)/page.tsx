import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Dumbbell, Eye, PenLine } from "lucide-react";
import { requireCoach } from "@/lib/auth";
import {
  getCoachWorkouts,
  getSettings,
  getStats,
  getTemplates,
  getWorkoutsBetween,
} from "@/lib/queries";
import { TopBar } from "@/components/nav";
import { EmptyState, SectionHeading, StatCard } from "@/components/ui";
import { WorkoutCard } from "@/components/workout-card";
import { PlannerHeader, type DayCell } from "@/components/coach/planner-header";
import { addDaysISO, buildDays, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CoachPlanning() {
  const role = await requireCoach();
  const today = todayISO();

  // Si les tables n'existent pas encore, on envoie le coach vers l'écran
  // d'installation plutôt que de lui montrer une page d'erreur.
  const data = await Promise.all([
    getCoachWorkouts(60),
    getTemplates(),
    getStats(),
    getSettings(),
    getWorkoutsBetween(addDaysISO(today, -2), addDaysISO(today, 20)),
  ]).catch(() => null);

  if (!data) redirect("/coach/reglages");
  const [workouts, templates, stats, settings, range] = data;

  const days: DayCell[] = buildDays(23, addDaysISO(today, -2)).map((iso) => ({
    iso,
    workouts: range
      .filter((w) => w.scheduledFor === iso)
      .map((w) => ({ id: w.id, title: w.title, status: w.status })),
  }));

  const drafts = workouts.filter((w) => w.status === "draft");
  const published = workouts
    .filter((w) => w.status === "published" && (w.scheduledFor ?? "") >= today)
    .sort((a, b) => (a.scheduledFor ?? "").localeCompare(b.scheduledFor ?? ""));
  const overdue = workouts.filter(
    (w) => w.status === "published" && (w.scheduledFor ?? "") < today,
  );
  const done = workouts.filter((w) => w.status === "done").slice(0, 5);

  const name = settings.athlete_name?.trim() || "Ton athlète";

  return (
    <>
      <TopBar title="Planning" subtitle={`Programme de ${name}`} role={role} />

      <PlannerHeader
        days={days}
        templates={templates.map((t) => ({
          id: t.id,
          title: t.title,
          exerciseCount: t.exerciseCount,
        }))}
      />

      <div className="mb-6 grid grid-cols-3 gap-2.5">
        <StatCard label="À venir" value={published.length} suffix="prêtes" accent="energy" />
        <StatCard label="Brouillons" value={drafts.length} accent="brand" />
        <StatCard label="Faites" value={stats.totalSessions} accent="violet" />
      </div>

      {drafts.length > 0 ? (
        <section className="mb-7">
          <SectionHeading title="Brouillons à finir" icon={<PenLine className="size-3.5" />} />
          <div className="space-y-2.5">
            {drafts.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/coach/seance/${w.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      {overdue.length > 0 ? (
        <section className="mb-7">
          <SectionHeading title="Publiées mais pas faites" />
          <div className="space-y-2.5">
            {overdue.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/coach/seance/${w.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      <section className="mb-7">
        <SectionHeading title="Prêtes pour elle" icon={<CalendarDays className="size-3.5" />} />
        {published.length === 0 ? (
          <EmptyState
            icon={<Dumbbell className="size-6" />}
            title="Aucune séance publiée"
            description="Compose une séance puis publie-la : elle la verra apparaître immédiatement."
          />
        ) : (
          <div className="space-y-2.5">
            {published.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/coach/seance/${w.id}`} />
            ))}
          </div>
        )}
      </section>

      {done.length > 0 ? (
        <section className="mb-7">
          <SectionHeading
            title="Dernières séances faites"
            action={
              <Link href="/coach/suivi" className="text-xs font-semibold text-brand">
                Voir le suivi
              </Link>
            }
          />
          <div className="space-y-2.5">
            {done.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/coach/seance/${w.id}`} />
            ))}
          </div>
        </section>
      ) : null}

      {templates.length > 0 ? (
        <section className="mb-7">
          <SectionHeading title="Mes modèles" />
          <div className="space-y-2.5">
            {templates.map((t) => (
              <Link
                key={t.id}
                href={`/coach/seance/${t.id}`}
                className="card card-hover flex items-center gap-3 p-3.5"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3">
                  📋
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{t.title}</span>
                  <span className="block text-[11.5px] text-faint">
                    {t.exerciseCount} exercices
                  </span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <Link href="/app" className="btn-ghost w-full">
        <Eye className="size-4" />
        Voir l'app comme elle la voit
      </Link>
    </>
  );
}
