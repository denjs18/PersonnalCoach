import Link from "next/link";
import { ChevronRight, Clock, Flame, ListChecks } from "lucide-react";
import type { WorkoutSummary } from "@/lib/queries";
import { INTENSITY } from "@/lib/constants";
import { formatRelativeDay, pluralize } from "@/lib/utils";
import { StatusBadge } from "./ui";
import { cn } from "@/lib/utils";

export function WorkoutMetaChips({ workout }: { workout: WorkoutSummary }) {
  const intensity = INTENSITY.find((i) => i.value === workout.intensity);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="chip">
        <ListChecks className="size-3.5" />
        {pluralize(workout.exerciseCount, "exercice")}
      </span>
      {workout.estimatedMinutes ? (
        <span className="chip">
          <Clock className="size-3.5" />~{workout.estimatedMinutes} min
        </span>
      ) : null}
      {intensity ? (
        <span className="chip">
          <Flame className="size-3.5" />
          {intensity.label}
        </span>
      ) : null}
    </div>
  );
}

export function WorkoutCard({
  workout,
  href,
  showStatus = true,
  className,
}: {
  workout: WorkoutSummary;
  href: string;
  showStatus?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("card card-hover block p-4", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand">
              {workout.scheduledFor ? formatRelativeDay(workout.scheduledFor) : "Modèle"}
            </span>
            {showStatus ? <StatusBadge status={workout.status} /> : null}
          </div>
          <h3 className="truncate text-[17px] font-bold leading-snug">{workout.title}</h3>
          {workout.focus ? (
            <p className="mt-0.5 truncate text-[13px] text-muted">{workout.focus}</p>
          ) : null}
          <div className="mt-2.5">
            <WorkoutMetaChips workout={workout} />
          </div>
        </div>
        <ChevronRight className="mt-6 size-5 shrink-0 text-faint" />
      </div>
    </Link>
  );
}

export function NextWorkoutHero({
  workout,
  href,
  cta = "Commencer la séance",
}: {
  workout: WorkoutSummary;
  href: string;
  cta?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.6rem] border border-brand/25 p-5">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/28 via-brand-2/16 to-brand-3/10"
      />
      <div
        aria-hidden
        className="absolute -right-14 -top-14 -z-10 size-44 rounded-full bg-brand/25 blur-3xl"
      />

      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
        {workout.scheduledFor ? formatRelativeDay(workout.scheduledFor) : "Prochaine séance"}
      </p>
      <h2 className="mt-1.5 text-[26px] font-extrabold leading-[1.15] tracking-tight">
        {workout.title}
      </h2>
      {workout.focus ? <p className="mt-1 text-sm text-fg/75">{workout.focus}</p> : null}

      <div className="mt-3.5">
        <WorkoutMetaChips workout={workout} />
      </div>

      {workout.coachNote ? (
        <p className="mt-3.5 rounded-xl border border-white/10 bg-black/25 p-3 text-[13px] leading-relaxed text-fg/85">
          <span className="mr-1.5 font-semibold text-brand">Mot du coach —</span>
          {workout.coachNote}
        </p>
      ) : null}

      <Link href={href} className="btn-primary mt-4 w-full animate-[var(--animate-pulse-ring)]">
        {cta}
      </Link>
    </div>
  );
}
