import Link from "next/link";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getFullWorkout, getLastPerformances, getSettings } from "@/lib/queries";
import { readProfile } from "@/lib/effort";
import { WorkoutPlayer, type PlayerItemData } from "@/components/player/workout-player";
import { EmptyState } from "@/components/ui";
import { formatLongDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SeancePage({ params }: { params: Promise<{ id: string }> }) {
  const role = await requireRole();
  const { id } = await params;

  const workout = await getFullWorkout(id);
  if (!workout || workout.isTemplate) notFound();

  if (workout.status === "draft" && role !== "coach") {
    return (
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6">
        <EmptyState
          icon={<Lock className="size-6" />}
          title="Cette séance n'est pas encore prête"
          description={
            workout.scheduledFor
              ? `Prévue le ${formatLongDate(workout.scheduledFor)}. Ton coach la finalise.`
              : "Ton coach la finalise, elle arrive bientôt."
          }
          action={
            <Link href="/app" className="btn-ghost">
              Retour à l'accueil
            </Link>
          }
        />
      </main>
    );
  }

  const [settings, lastPerfs] = await Promise.all([
    getSettings(),
    getLastPerformances(
      [...new Set(workout.items.map((i) => i.exerciseId))],
      workout.id,
    ),
  ]);

  const items: PlayerItemData[] = workout.items.map((item) => ({
    id: item.id,
    exerciseId: item.exerciseId,
    name: item.exercise.name,
    category: item.exercise.category,
    equipment: item.exercise.equipment,
    description: item.exercise.description,
    steps: item.exercise.steps,
    cues: item.exercise.cues,
    tracking: item.tracking ?? item.exercise.tracking,
    section: item.section,
    met: item.exercise.met,
    sets: item.sets,
    targetReps: item.targetReps,
    targetWeight: item.targetWeight,
    targetTimeSec: item.targetTimeSec,
    targetDistanceM: item.targetDistanceM,
    restSec: item.restSec,
    note: item.note,
    supersetGroup: item.supersetGroup,
    initialLogs: workout.logs
      .filter((log) => log.workoutItemId === item.id)
      .map((log) => ({
        setNumber: log.setNumber,
        reps: log.reps,
        weightKg: log.weightKg,
        timeSec: log.timeSec,
        distanceM: log.distanceM,
        rpe: log.rpe,
        done: log.done,
        loggedAt: log.loggedAt ? log.loggedAt.toISOString() : null,
      })),
    last: lastPerfs.get(item.exerciseId) ?? null,
  }));

  return (
    <main>
      <WorkoutPlayer
        workout={{
          id: workout.id,
          title: workout.title,
          focus: workout.focus,
          coachNote: workout.coachNote,
          scheduledFor: workout.scheduledFor,
          status: workout.status,
          startedAt: workout.startedAt ? workout.startedAt.toISOString() : null,
        }}
        items={items}
        profile={readProfile(settings)}
        readOnly={workout.status === "done"}
      />
    </main>
  );
}
