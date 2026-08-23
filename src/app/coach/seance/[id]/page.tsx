import { notFound } from "next/navigation";
import { requireCoach } from "@/lib/auth";
import { getFullWorkout, listExercises } from "@/lib/queries";
import { countLoggedSets } from "@/lib/actions/workouts";
import { WorkoutBuilder, type BuilderItem } from "@/components/coach/workout-builder";

export const dynamic = "force-dynamic";

export default async function CoachWorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCoach();
  const { id } = await params;

  const [workout, exercises] = await Promise.all([getFullWorkout(id), listExercises()]);
  if (!workout) notFound();

  const loggedSets = await countLoggedSets(id);

  const items: BuilderItem[] = workout.items.map((item) => ({
    key: item.id,
    id: item.id,
    exerciseId: item.exerciseId,
    exerciseName: item.exercise.name,
    exerciseCategory: item.exercise.category,
    exerciseTracking: item.exercise.tracking,
    exerciseDescription: item.exercise.description,
    exerciseSteps: item.exercise.steps,
    exerciseCues: item.exercise.cues,
    section: item.section,
    sets: item.sets,
    targetReps: item.targetReps,
    targetWeight: item.targetWeight,
    targetTimeSec: item.targetTimeSec,
    targetDistanceM: item.targetDistanceM,
    restSec: item.restSec,
    note: item.note,
    supersetGroup: item.supersetGroup,
    tracking: item.tracking,
  }));

  return (
    <WorkoutBuilder
      workout={{
        id: workout.id,
        title: workout.title,
        scheduledFor: workout.scheduledFor,
        status: workout.status,
        isTemplate: workout.isTemplate,
        focus: workout.focus,
        coachNote: workout.coachNote,
        estimatedMinutes: workout.estimatedMinutes,
        intensity: workout.intensity,
        loggedSets,
      }}
      initialItems={items}
      exercises={exercises}
    />
  );
}
