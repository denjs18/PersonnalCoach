"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, Plus, X } from "lucide-react";
import { createWorkoutAction, duplicateWorkoutAction } from "@/lib/actions/workouts";
import { cn, formatLongDate, parseISODate, todayISO } from "@/lib/utils";

export type DayCell = {
  iso: string;
  workouts: Array<{ id: string; title: string; status: string }>;
};

export type TemplateOption = { id: string; title: string; exerciseCount: number };

export function PlannerHeader({
  days,
  templates,
}: {
  days: DayCell[];
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [sheetDate, setSheetDate] = useState<string | null>(null);
  const today = todayISO();

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        {days.map((day) => {
          const date = parseISODate(day.iso);
          const isToday = day.iso === today;
          const has = day.workouts.length > 0;
          const published = day.workouts.some((w) => w.status === "published");
          const done = day.workouts.every((w) => w.status === "done") && has;

          return (
            <button
              key={day.iso}
              type="button"
              onClick={() => {
                if (day.workouts.length === 1) router.push(`/coach/seance/${day.workouts[0].id}`);
                else setSheetDate(day.iso);
              }}
              className={cn(
                "flex w-[3.1rem] shrink-0 flex-col items-center gap-1 rounded-xl border py-2 transition active:scale-95",
                isToday
                  ? "border-brand/60 bg-brand/12"
                  : has
                    ? "border-line bg-surface-2/70"
                    : "border-line/60 bg-surface/40",
              )}
            >
              <span className="text-[9.5px] font-bold uppercase tracking-wide text-faint">
                {date.toLocaleDateString("fr-FR", { weekday: "short" }).replace(".", "")}
              </span>
              <span
                className={cn(
                  "text-[15px] font-extrabold tabular-nums",
                  isToday ? "text-brand" : "text-fg",
                )}
              >
                {date.getDate()}
              </span>
              <span
                className={cn(
                  "size-1.5 rounded-full transition-colors",
                  done
                    ? "bg-brand-2"
                    : published
                      ? "bg-energy"
                      : has
                        ? "bg-muted"
                        : "bg-transparent",
                )}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => setSheetDate(today)}
        className="btn-primary mb-5 w-full"
      >
        <CalendarPlus className="size-4" />
        Préparer une séance
      </button>

      {sheetDate ? (
        <NewWorkoutSheet
          date={sheetDate}
          templates={templates}
          onClose={() => setSheetDate(null)}
        />
      ) : null}
    </>
  );
}

const QUICK_TITLES = [
  "Bas du corps & fessiers",
  "Full body poids libres",
  "Haut du corps & gainage",
  "Cardio & explosivité",
  "Séance à deux",
  "Mobilité & récupération",
];

function NewWorkoutSheet({
  date,
  templates,
  onClose,
}: {
  date: string;
  templates: TemplateOption[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [value, setValue] = useState(date);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);

  const fromTemplate = async (templateId: string) => {
    setPending(true);
    try {
      const res = await duplicateWorkoutAction(templateId, value);
      if (res.ok) router.push(`/coach/seance/${res.id}`);
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm">
      <div className="animate-[var(--animate-rise)] max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-[1.6rem] border-t border-line bg-ink-2 p-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">Nouvelle séance</h2>
            <p className="text-[12.5px] text-muted">{formatLongDate(value)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Fermer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form action={createWorkoutAction} className="space-y-3.5">
          <div>
            <label className="label" htmlFor="new-date">
              Date
            </label>
            <input
              id="new-date"
              name="scheduledFor"
              type="date"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="field"
            />
          </div>

          <div>
            <label className="label" htmlFor="new-title">
              Titre
            </label>
            <input
              id="new-title"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Bas du corps & fessiers"
              className="field"
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {QUICK_TITLES.map((quick) => (
                <button
                  key={quick}
                  type="button"
                  onClick={() => setTitle(quick)}
                  className="chip transition active:scale-95 hover:text-fg"
                >
                  {quick}
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={pending} className="btn-primary w-full">
            <Plus className="size-4" />
            Créer et composer
          </button>
        </form>

        {templates.length > 0 ? (
          <div className="mt-6">
            <p className="section-title mb-2.5">Ou partir d'un modèle</p>
            <div className="space-y-1.5">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  disabled={pending}
                  onClick={() => fromTemplate(tpl.id)}
                  className="card card-hover flex w-full items-center gap-3 p-3 text-left"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-3 text-sm">
                    📋
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold">{tpl.title}</span>
                    <span className="block text-[11.5px] text-faint">
                      {tpl.exerciseCount} exercices
                    </span>
                  </span>
                  {pending ? (
                    <Loader2 className="size-4 animate-spin text-faint" />
                  ) : (
                    <Plus className="size-4 shrink-0 text-brand" />
                  )}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
