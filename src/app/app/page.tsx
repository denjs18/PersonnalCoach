import Link from "next/link";
import { CalendarClock, CheckCircle2, Dumbbell, Sparkles, TrendingUp } from "lucide-react";
import { requireRole } from "@/lib/auth";
import {
  getCompletedWorkouts,
  getMissedWorkouts,
  getSettings,
  getStats,
  getUpcomingWorkouts,
} from "@/lib/queries";
import { NextWorkoutHero, WorkoutCard } from "@/components/workout-card";
import { EmptyState, ProgressBar, SectionHeading, StatCard } from "@/components/ui";
import { TopBar } from "@/components/nav";
import { formatRelativeDay, pluralize, todayISO } from "@/lib/utils";

export const dynamic = "force-dynamic";

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" })
      .format(new Date())
      .replace(/\D/g, ""),
  );
  if (hour < 6) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

const PUNCHLINES = [
  "Chaque séance compte. Même les moyennes.",
  "La régularité bat l'intensité.",
  "Tu es plus forte que la semaine dernière.",
  "Le plus dur, c'est d'enfiler les baskets.",
  "Un pas de plus vers ton objectif.",
  "Pas de séance parfaite, juste des séances faites.",
];

export default async function AthleteHome() {
  const role = await requireRole();
  const data = await Promise.all([
    getUpcomingWorkouts(8),
    getMissedWorkouts(4),
    getCompletedWorkouts(3),
    getStats(),
    getSettings(),
  ]).catch(() => null);

  // La base n'est pas encore installée : inutile de l'inquiéter avec une erreur.
  if (!data) {
    return (
      <>
        <TopBar title={greeting()} role={role} />
        <EmptyState
          icon={<CalendarClock className="size-6" />}
          title="L'app finit de s'installer"
          description="Ton coach termine la configuration. Reviens dans quelques minutes !"
        />
      </>
    );
  }

  const [upcoming, missed, completed, stats, settings] = data;

  const today = todayISO();
  const name = settings.athlete_name?.trim();
  const goal = Math.max(1, Number(settings.goal_per_week) || 3);
  const punchline =
    settings.motivation?.trim() ||
    PUNCHLINES[new Date().getDate() % PUNCHLINES.length];

  const next = upcoming[0];
  const rest = upcoming.slice(1);
  const lastDone = completed[0];

  return (
    <>
      <TopBar
        title={name ? `${greeting()}, ${name}` : greeting()}
        subtitle={formatRelativeDay(today)}
        role={role}
      />

      <p className="mb-5 text-[13px] italic text-muted">« {punchline} »</p>

      {next ? (
        <NextWorkoutHero
          workout={next}
          href={`/seance/${next.id}`}
          cta={next.scheduledFor === today ? "Commencer la séance" : "Voir la séance"}
        />
      ) : (
        <EmptyState
          icon={<CalendarClock className="size-6" />}
          title="Aucune séance prête pour l'instant"
          description="Ton coach n'a pas encore publié la prochaine. Ça arrive bientôt !"
        />
      )}

      {/* Objectif de la semaine */}
      <div className="card mt-4 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-semibold">Objectif de la semaine</p>
          <p className="text-sm font-bold tabular-nums text-energy">
            {stats.sessionsThisWeek}
            <span className="text-muted">/{goal}</span>
          </p>
        </div>
        <ProgressBar value={stats.sessionsThisWeek} max={goal} tone="energy" />
        <p className="mt-2 text-[12px] text-faint">
          {stats.sessionsThisWeek >= goal
            ? "Objectif atteint 🎉 tout ce qui suit est du bonus."
            : `Encore ${pluralize(goal - stats.sessionsThisWeek, "séance")} pour valider la semaine.`}
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2.5">
        <StatCard label="Série" value={stats.weekStreak} suffix="sem." accent="brand" />
        <StatCard label="Ce mois" value={stats.sessionsThisMonth} suffix="séances" accent="cyan" />
        <StatCard label="Total" value={stats.totalSessions} suffix="séances" accent="violet" />
      </div>

      {missed.length > 0 ? (
        <section className="mt-7">
          <SectionHeading title="À rattraper" />
          <div className="space-y-2.5">
            {missed.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/seance/${w.id}`} showStatus={false} />
            ))}
          </div>
        </section>
      ) : null}

      {rest.length > 0 ? (
        <section className="mt-7">
          <SectionHeading title="La suite du programme" />
          <div className="space-y-2.5">
            {rest.map((w) => (
              <WorkoutCard key={w.id} workout={w} href={`/seance/${w.id}`} showStatus={false} />
            ))}
          </div>
        </section>
      ) : null}

      {lastDone ? (
        <section className="mt-7">
          <SectionHeading
            title="Dernière séance"
            action={
              <Link href="/app/historique" className="text-xs font-semibold text-brand">
                Tout voir
              </Link>
            }
          />
          <Link href={`/app/historique#${lastDone.id}`} className="card card-hover block p-4">
            <div className="flex items-center gap-3">
              <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-energy/12 text-energy">
                <CheckCircle2 className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{lastDone.title}</p>
                <p className="text-[12px] text-faint">
                  {lastDone.scheduledFor ? formatRelativeDay(lastDone.scheduledFor) : ""} ·{" "}
                  {pluralize(lastDone.loggedSets, "série validée", "séries validées")}
                </p>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      <section className="mt-7 grid grid-cols-2 gap-2.5">
        <Link href="/app/progression" className="card card-hover flex items-center gap-2.5 p-3.5">
          <TrendingUp className="size-5 text-brand-2" />
          <span className="text-sm font-semibold">Ma progression</span>
        </Link>
        <Link href="/app/historique" className="card card-hover flex items-center gap-2.5 p-3.5">
          <Dumbbell className="size-5 text-brand-3" />
          <span className="text-sm font-semibold">Mon historique</span>
        </Link>
      </section>

      {role === "coach" ? (
        <Link href="/coach" className="btn-ghost mt-5 w-full">
          <Sparkles className="size-4" />
          Retour à l'espace coach
        </Link>
      ) : null}
    </>
  );
}
