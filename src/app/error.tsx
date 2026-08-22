"use client";

import { useEffect } from "react";
import { RefreshCcw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const looksLikeDb =
    /DATABASE_URL|neon|connect|relation .* does not exist|ECONN/i.test(error.message);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 text-center">
      <div className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-surface-2 text-2xl">
        😕
      </div>
      <h1 className="text-xl font-extrabold">Quelque chose a coincé</h1>
      <p className="mt-2 text-sm text-muted">
        {looksLikeDb
          ? "La base de données ne répond pas, ou les tables ne sont pas encore créées."
          : "Une erreur inattendue est survenue."}
      </p>

      <button type="button" onClick={reset} className="btn-primary mt-6">
        <RefreshCcw className="size-4" />
        Réessayer
      </button>

      {looksLikeDb ? (
        <a href="/installation" className="btn-quiet mt-2">
          Voir les étapes d'installation
        </a>
      ) : null}
    </main>
  );
}
