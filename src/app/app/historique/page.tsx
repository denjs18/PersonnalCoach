import Link from "next/link";
import { CalendarX2, ChevronRight, Clock, Layers } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getCompletedWorkouts, getStats } from "@/lib/queries";
import { TopBar } from "@/components/nav";
import { EmptyState, StatCard } from "@/components/ui";
import { MOODS } from "@/lib/constants";
import { formatDuration, formatShortDate, parseISODate, pluralize } from "@/lib/utils";

export const dynamic = "force-dynamic";

function monthLabel(iso: string): string {
  const label = parseISODate(iso).toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default async function HistoriquePage() {
  const role = await requireRole();
  const [sessions, stats] = await Promise.all([getCompletedWorkouts(120), getStats()]);

  const groups = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const key = session.scheduledFor
      ? session.scheduledFor.slice(0, 7)
      : (session.completedAt?.toISOString().slice(0, 7) ?? "—");
    groups.set(key, [...(groups.get(key) ?? []), session]);
  }

  return (
    <>
      <TopBar title="Historique" subtitle="Tout ce que tu as accompli" role={role} />

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard label="Séances" value={stats.totalSessions} accent="brand" />
        <StatCard
          label="Temps total"
          value={stats.totalMinutes >= 60 ? Math.round(stats.totalMinutes / 60) : stats.totalMinutes}
          suffix={stats.totalMinutes >= 60 ? "h" : "min"}
          accent="cyan"
        />
        <StatCard
          label="Volume"
          value={
            stats.totalVolumeKg >= 1000
              ? `${(stats.totalVolumeKg / 1000).toFixed(1).replace(".", ",")}`
              : stats.totalVolumeKg
          }
          suffix={stats.totalVolumeKg >= 1000 ? "tonnes" : "kg"}
          accent="violet"
        />
      </div>

      {sessions.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<CalendarX2 className="size-6" />}
            title="Rien dans l'historique"
            description="Tes séances terminées apparaîtront ici, avec tes performances."
            action={
              <Link href="/app" className="btn-primary">
                Voir mes séances
              </Link>
            }
          />
        </div>
      ) : null}

      {[...groups.entries()].map(([month, list]) => (
        <section key={month} className="mt-7">
          <h2 className="section-title mb-2.5">
            {month === "—" ? "Sans date" : monthLabel(`${month}-01`)} ·{" "}
            {pluralize(list.length, "séance")}
          </h2>
          <div className="space-y-2.5">
            {list.map((session) => {
              const mood = MOODS.find((m) => m.value === session.athleteRating);
              return (
                <Link
                  key={session.id}
                  id={session.id}
                  href={`/seance/${session.id}`}
                  className="card card-hover block scroll-mt-24 p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand/20 to-brand-2/12 text-lg">
                      {mood?.emoji ?? "✅"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">
                        {session.scheduledFor ? formatShortDate(session.scheduledFor) : "—"}
                      </p>
                      <h3 className="truncate font-bold leading-snug">{session.title}</h3>
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
                      </div>
                      {session.athleteNote ? (
                        <p className="mt-2 line-clamp-2 text-[12.5px] italic text-muted">
                          « {session.athleteNote} »
                        </p>
                      ) : null}
                    </div>
                    <ChevronRight className="mt-5 size-5 shrink-0 text-faint" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </>
  );
}
