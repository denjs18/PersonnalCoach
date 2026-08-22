"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Database, Loader2, RefreshCw } from "lucide-react";
import { initDatabaseAction, type DatabaseState } from "@/lib/actions/database";

export function DatabaseCard({ initial }: { initial: DatabaseState }) {
  const [state, setState] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justRan, setJustRan] = useState(false);

  const run = async () => {
    setPending(true);
    setError(null);
    setJustRan(false);
    try {
      const res = await initDatabaseAction();
      if (res.ok) {
        setState(res.state);
        setJustRan(true);
      } else {
        setError(res.error);
      }
    } catch {
      setError("Le serveur n'a pas répondu. Réessaie dans un instant.");
    } finally {
      setPending(false);
    }
  };

  const needsWork = !state.ready || state.missing > 0;

  return (
    <section className="card p-4">
      <div className="mb-3 flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-brand-3">
          <Database className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Base de données</p>
          {state.ready ? (
            <p className="text-[12.5px] text-muted">
              {state.total} exercices en base
              {state.custom > 0 ? ` · ${state.custom} créés par toi` : ""}
            </p>
          ) : (
            <p className="text-[12.5px] text-warn">Les tables ne sont pas encore créées.</p>
          )}
        </div>
      </div>

      {state.ready && state.missing > 0 ? (
        <p className="mb-3 flex items-start gap-2 rounded-xl border border-warn/30 bg-warn/10 p-2.5 text-[12.5px] text-warn">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {state.missing} exercices de la bibliothèque de base ne sont pas installés.
        </p>
      ) : null}

      {error ? (
        <p className="mb-3 rounded-xl border border-danger/30 bg-danger/10 p-2.5 text-[12.5px] text-danger">
          {error}
        </p>
      ) : null}

      {justRan && !error ? (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-energy/30 bg-energy/10 p-2.5 text-[12.5px] text-energy">
          <CheckCircle2 className="size-3.5 shrink-0" />
          Base à jour : {state.total} exercices disponibles.
        </p>
      ) : null}

      <button
        type="button"
        onClick={run}
        disabled={pending}
        className={needsWork ? "btn-primary w-full" : "btn-ghost w-full"}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
        {pending
          ? "Installation…"
          : state.ready
            ? "Mettre à jour la bibliothèque"
            : "Installer la base"}
      </button>

      <p className="mt-2 text-[11.5px] text-faint">
        Crée les tables manquantes et réinstalle les exercices de base. Sans risque : tes
        exercices personnels et tes séances ne sont jamais touchés.
      </p>
    </section>
  );
}
