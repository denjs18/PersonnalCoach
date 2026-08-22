import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 text-center">
      <p className="text-5xl font-extrabold gradient-text">404</p>
      <h1 className="mt-3 text-xl font-extrabold">Page introuvable</h1>
      <p className="mt-2 text-sm text-muted">
        Cette page n'existe pas ou la séance a été supprimée.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Retour à l'accueil
      </Link>
    </main>
  );
}
