import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award, Repeat, Trophy } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getExerciseProgress } from "@/lib/queries";
import { CategoryBadge, StatCard } from "@/components/ui";
import { ProgressChart } from "@/components/progress-chart";
import { EQUIPMENT, type EquipmentKey } from "@/lib/constants";
import { formatDistance, formatDuration, formatShortDate, formatWeight } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ExerciseProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole();
  const { id } = await params;

  const progress = await getExerciseProgress(id);
  if (!progress) notFound();

  const { exercise, points } = progress;
  const tracking = exercise.tracking;

  const weightChart = points
    .filter((p) => p.bestWeight)
    .map((p) => ({ label: formatShortLabel(p.date), value: p.bestWeight ?? 0 }));
  const volumeChart = points
    .filter((p) => p.totalVolume > 0)
    .map((p) => ({ label: formatShortLabel(p.date), value: Math.round(p.totalVolume) }));
  const repsChart = points.map((p) => ({
    label: formatShortLabel(p.date),
    value: p.totalReps,
  }));
  const timeChart = points
    .filter((p) => p.bestTimeSec)
    .map((p) => ({ label: formatShortLabel(p.date), value: p.bestTimeSec ?? 0 }));
  const distanceChart = points
    .filter((p) => p.bestDistanceM)
    .map((p) => ({ label: formatShortLabel(p.date), value: p.bestDistanceM ?? 0 }));

  const bestWeight = Math.max(0, ...points.map((p) => p.bestWeight ?? 0));
  const bestReps = Math.max(0, ...points.map((p) => p.bestReps ?? 0));
  const bestTime = Math.max(0, ...points.map((p) => p.bestTimeSec ?? 0));
  const bestDistance = Math.max(0, ...points.map((p) => p.bestDistanceM ?? 0));
  const totalSets = points.reduce((acc, p) => acc + p.sets, 0);

  return (
    <>
      <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line/50 bg-ink/75 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Link
            href="/app/progression"
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Retour"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-extrabold leading-tight">{exercise.name}</h1>
            <p className="text-[11px] text-faint">
              {points.length} séance{points.length > 1 ? "s" : ""} · {totalSets} séries
            </p>
          </div>
        </div>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5">
        <CategoryBadge category={exercise.category} />
        {exercise.equipment.map((eq) => (
          <span key={eq} className="chip">
            {EQUIPMENT[eq as EquipmentKey] ?? eq}
          </span>
        ))}
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2.5">
        {bestWeight > 0 ? (
          <StatCard label="Record charge" value={formatWeight(bestWeight)} accent="brand" />
        ) : null}
        {bestReps > 0 ? (
          <StatCard label="Record reps" value={bestReps} suffix="reps" accent="cyan" />
        ) : null}
        {bestTime > 0 ? (
          <StatCard label="Record temps" value={formatDuration(bestTime)} accent="violet" />
        ) : null}
        {bestDistance > 0 ? (
          <StatCard label="Record distance" value={formatDistance(bestDistance)} accent="energy" />
        ) : null}
      </div>

      {weightChart.length > 0 ? (
        <ChartCard
          title="Charge maximale par séance"
          icon={<Trophy className="size-4 text-brand" />}
          unit="kg"
        >
          <ProgressChart points={weightChart} unit="kg" tone="brand" />
        </ChartCard>
      ) : null}

      {volumeChart.length > 0 ? (
        <ChartCard
          title="Volume total (reps × kg)"
          icon={<Award className="size-4 text-brand-2" />}
          unit="kg"
        >
          <ProgressChart points={volumeChart} unit="kg" tone="violet" />
        </ChartCard>
      ) : null}

      {/* Les répétitions valent la peine d'être tracées dès qu'aucune charge n'est notée. */}
      {(tracking === "reps" || weightChart.length === 0) && repsChart.some((p) => p.value > 0) ? (
        <ChartCard
          title="Répétitions par séance"
          icon={<Repeat className="size-4 text-brand-3" />}
          unit="reps"
        >
          <ProgressChart points={repsChart} unit="reps" tone="cyan" />
        </ChartCard>
      ) : null}

      {timeChart.length > 0 ? (
        <ChartCard title="Meilleur temps" icon={<Trophy className="size-4 text-brand-2" />}>
          <ProgressChart points={timeChart} unit="s" tone="violet" />
        </ChartCard>
      ) : null}

      {distanceChart.length > 0 ? (
        <ChartCard title="Distance" icon={<Trophy className="size-4 text-brand-3" />} unit="m">
          <ProgressChart points={distanceChart} unit="m" tone="cyan" />
        </ChartCard>
      ) : null}

      <section className="mt-6">
        <h2 className="section-title mb-2.5">Détail par séance</h2>
        <div className="card divide-y divide-line/60">
          {[...points].reverse().map((p) => (
            <div key={p.date} className="flex items-center justify-between gap-3 px-4 py-3">
              <span className="text-sm font-semibold">{formatShortDate(p.date)}</span>
              <span className="text-right text-[13px] tabular-nums text-muted">
                {summaryLine(p)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ChartCard({
  title,
  icon,
  unit,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-3.5 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold">
        {icon}
        {title}
        {unit ? <span className="font-medium text-faint">({unit})</span> : null}
      </h2>
      {children}
    </section>
  );
}

function summaryLine(p: {
  sets: number;
  bestWeight: number | null;
  bestReps: number | null;
  totalReps: number;
  totalVolume: number;
  bestTimeSec: number | null;
  bestDistanceM: number | null;
}): string {
  const bits: string[] = [`${p.sets} séries`];
  if (p.bestWeight) bits.push(formatWeight(p.bestWeight));
  if (p.totalReps) bits.push(`${p.totalReps} reps`);
  if (p.bestTimeSec) bits.push(formatDuration(p.bestTimeSec));
  if (p.bestDistanceM) bits.push(formatDistance(p.bestDistanceM));
  return bits.join(" · ");
}

function formatShortLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}
