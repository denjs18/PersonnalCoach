import { PlayCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Le « comment on fait » d'un exercice : une phrase, le déroulé numéroté,
 * les points de vigilance, et un lien vidéo pour les mouvements qu'on ne
 * connaît pas encore. Utilisé côté coach comme côté athlète.
 */
export function ExerciseHowTo({
  name,
  description,
  steps,
  cues,
  className,
  showVideoLink = true,
}: {
  name: string;
  description?: string | null;
  steps?: string[] | null;
  cues?: string | null;
  className?: string;
  showVideoLink?: boolean;
}) {
  const hasSteps = Boolean(steps?.length);
  if (!description && !hasSteps && !cues) return null;

  return (
    <div className={cn("space-y-3 text-[13px] leading-relaxed", className)}>
      {description ? <p className="text-muted">{description}</p> : null}

      {hasSteps ? (
        <ol className="space-y-2">
          {steps!.map((step, i) => (
            <li key={i} className="flex gap-2.5">
              <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-brand/15 text-[10px] font-extrabold text-brand">
                {i + 1}
              </span>
              <span className="text-fg/85">{step}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {cues ? (
        <p className="rounded-lg bg-surface-2/70 p-2.5 text-fg/80">
          <span className="font-semibold text-brand">À surveiller — </span>
          {cues}
        </p>
      ) : null}

      {showVideoLink ? (
        <a
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercice technique`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-3 hover:underline"
        >
          <PlayCircle className="size-4" />
          Voir une vidéo de l'exercice
        </a>
      ) : null}
    </div>
  );
}
