import { Lock } from "lucide-react";
import {
  BADGE_FAMILIES,
  type BadgeFamily,
  type BadgeState,
  type CategoryProgress,
  type LevelProgress,
} from "@/lib/levels";
import { cn } from "@/lib/utils";

const formatXp = (xp: number) => xp.toLocaleString("fr-FR");

/** Le niveau atteint et ce qu'il reste avant le suivant. */
export function LevelCard({
  level,
  compact = false,
}: {
  level: LevelProgress;
  compact?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[1.4rem] border border-brand/25 p-4">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-br from-brand/25 via-brand-2/15 to-brand-3/10"
      />
      <div
        aria-hidden
        className="absolute -right-10 -top-12 -z-10 size-36 rounded-full bg-brand/25 blur-3xl"
      />

      <div className="flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-black/25 text-3xl">
          {level.current.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand">
            Niveau {level.current.level}
          </p>
          <p className="truncate text-xl font-extrabold leading-tight">{level.current.title}</p>
          <p className="text-[12px] text-fg/70">{formatXp(level.xp)} points</p>
        </div>
      </div>

      {level.next ? (
        <div className="mt-3.5">
          <div className="mb-1.5 flex items-baseline justify-between text-[11.5px]">
            <span className="font-semibold text-fg/80">
              {level.next.emoji} {level.next.title}
            </span>
            <span className="tabular-nums text-fg/70">
              encore {formatXp(level.xpForNextLevel - level.xpIntoLevel)} pts
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand to-brand-2 transition-[width] duration-700"
              style={{ width: `${Math.max(3, level.ratio * 100)}%` }}
            />
          </div>
        </div>
      ) : (
        <p className="mt-3.5 text-center text-[12.5px] font-semibold text-energy">
          Niveau maximum atteint 👑
        </p>
      )}

      {!compact && level.next ? (
        <p className="mt-2.5 text-[11.5px] leading-relaxed text-fg/60">
          Chaque séance terminée rapporte des points : la régularité compte plus que la
          performance.
        </p>
      ) : null}
    </div>
  );
}

/** Un rang par famille d'exercices : montre ce qui est travaillé et ce qui est négligé. */
export function CategoryRanks({ categories }: { categories: CategoryProgress[] }) {
  return (
    <div className="space-y-2">
      {categories.map((c) => (
        <div key={c.category} className="card p-3.5">
          <div className="flex items-center gap-2.5">
            <span
              className="grid size-9 shrink-0 place-items-center rounded-xl text-base"
              style={{ backgroundColor: `color-mix(in oklab, ${c.color} 16%, transparent)` }}
            >
              {c.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold leading-tight">{c.label}</p>
              <p className="text-[11.5px]" style={{ color: c.color }}>
                {c.rank > 0 ? `Rang ${c.rank} · ${c.title}` : c.title}
              </p>
            </div>
            <span className="shrink-0 text-right text-[11.5px] tabular-nums text-faint">
              {c.sets} série{c.sets > 1 ? "s" : ""}
              {c.nextAt ? <span className="block">/ {c.nextAt}</span> : null}
            </span>
          </div>
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full transition-[width] duration-700"
              style={{ width: `${Math.max(2, c.ratio * 100)}%`, backgroundColor: c.color }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatProgress(badge: BadgeState): string {
  const round = (n: number) => Math.round(n).toLocaleString("fr-FR");
  return `${round(Math.min(badge.current, badge.target))} / ${round(badge.target)}`;
}

export function BadgeTile({ badge }: { badge: BadgeState }) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-2xl border p-3 text-center transition",
        badge.earned
          ? "border-energy/35 bg-energy/[0.07]"
          : "border-line/70 bg-surface/50",
      )}
    >
      <span
        className={cn(
          "grid size-11 place-items-center rounded-xl text-xl",
          badge.earned ? "bg-energy/15" : "bg-surface-2 grayscale",
        )}
      >
        {badge.earned ? badge.emoji : <Lock className="size-4 text-faint" />}
      </span>
      <p
        className={cn(
          "text-[11.5px] font-bold leading-tight",
          badge.earned ? "text-fg" : "text-muted",
        )}
      >
        {badge.title}
      </p>
      {badge.earned ? (
        <p className="text-[10px] leading-snug text-faint">{badge.description}</p>
      ) : (
        <>
          <p className="text-[10px] tabular-nums text-faint">{formatProgress(badge)}</p>
          <div className="h-1 w-full overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-muted/60"
              style={{ width: `${Math.max(2, badge.ratio * 100)}%` }}
            />
          </div>
        </>
      )}
    </div>
  );
}

export function BadgeGrid({ badges }: { badges: BadgeState[] }) {
  const families = Object.keys(BADGE_FAMILIES) as BadgeFamily[];

  return (
    <div className="space-y-6">
      {families.map((family) => {
        const list = badges.filter((b) => b.family === family);
        if (list.length === 0) return null;
        const earned = list.filter((b) => b.earned).length;

        return (
          <section key={family}>
            <h3 className="section-title mb-2.5 flex items-center gap-1.5">
              <span aria-hidden>{BADGE_FAMILIES[family].emoji}</span>
              {BADGE_FAMILIES[family].label}
              <span className="ml-auto tabular-nums normal-case tracking-normal text-faint">
                {earned}/{list.length}
              </span>
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {list.map((badge) => (
                <BadgeTile key={badge.id} badge={badge} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
