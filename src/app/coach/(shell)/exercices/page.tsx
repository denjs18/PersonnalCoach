import { requireCoach } from "@/lib/auth";
import { listExercises } from "@/lib/queries";
import { TopBar } from "@/components/nav";
import { ExerciseLibrary } from "@/components/coach/exercise-library";

export const dynamic = "force-dynamic";

export default async function ExercicesPage() {
  const role = await requireCoach();
  const exercises = await listExercises({ includeArchived: true });

  return (
    <>
      <TopBar
        title="Bibliothèque"
        subtitle={`${exercises.filter((e) => !e.isArchived).length} exercices disponibles`}
        role={role}
      />
      <ExerciseLibrary initial={exercises} />
    </>
  );
}
