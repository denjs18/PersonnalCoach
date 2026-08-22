import { Database, KeyRound, Rocket, Terminal } from "lucide-react";
import { isDbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function InstallationPage() {
  return (
    <main className="mx-auto w-full max-w-md px-5 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand-2 text-2xl">
          🔧
        </div>
        <h1 className="text-2xl font-extrabold">Plus qu'une étape</h1>
        <p className="mt-1.5 text-sm text-muted">
          L'app est en ligne, il ne manque que la base de données.
        </p>
      </div>

      <Step
        number={1}
        icon={<Database className="size-4" />}
        title="Créer une base Postgres gratuite"
      >
        <p>
          Va sur <strong className="text-fg">neon.com</strong>, crée un compte, puis un projet
          (région Europe). Copie la chaîne de connexion <em>pooled</em>, elle ressemble à{" "}
          <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">
            postgresql://…-pooler…neon.tech/neondb?sslmode=require
          </code>
          .
        </p>
      </Step>

      <Step number={2} icon={<KeyRound className="size-4" />} title="Renseigner les variables">
        <p>
          Dans Vercel : <strong className="text-fg">Settings → Environment Variables</strong>. En
          local : un fichier <code className="rounded bg-surface-2 px-1 py-0.5 text-[11px]">.env.local</code>.
        </p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 text-[11.5px] leading-relaxed text-muted">
{`DATABASE_URL="postgresql://…"
COACH_PIN="1234"
ATHLETE_PIN="0000"
AUTH_SECRET="une-longue-chaine-aleatoire"`}
        </pre>
      </Step>

      <Step number={3} icon={<Terminal className="size-4" />} title="Créer les tables">
        <p>Une seule commande, depuis le dossier du projet :</p>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-ink p-3 text-[11.5px] text-muted">
          npm run db:setup
        </pre>
        <p className="mt-2 text-[12px] text-faint">
          Elle crée les tables et installe les 119 exercices de départ.
        </p>
      </Step>

      <Step number={4} icon={<Rocket className="size-4" />} title="Redéployer">
        <p>
          Sur Vercel, relance un déploiement pour que les variables soient prises en compte. Puis
          recharge cette page.
        </p>
      </Step>

      <div
        className={`card mt-6 p-4 text-center text-sm ${
          isDbConfigured ? "border-energy/40 text-energy" : "border-warn/30 text-warn"
        }`}
      >
        {isDbConfigured
          ? "DATABASE_URL est bien détecté ✅ — recharge la page d'accueil."
          : "DATABASE_URL n'est pas encore détecté."}
      </div>

      <a href="/" className="btn-ghost mt-4 w-full">
        Retour à l'accueil
      </a>
    </main>
  );
}

function Step({
  number,
  icon,
  title,
  children,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card mb-3 p-4">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand/15 text-[12px] font-extrabold text-brand">
          {number}
        </span>
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold">
          <span className="text-brand">{icon}</span>
          {title}
        </h2>
      </div>
      <div className="space-y-1 text-[13px] leading-relaxed text-muted">{children}</div>
    </section>
  );
}
