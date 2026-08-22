import type { ReactNode } from "react";
import { CATEGORIES, type CategoryKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function SectionHeading({
  title,
  action,
  icon,
}: {
  title: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="section-title flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  suffix,
  accent = "brand",
  hint,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  accent?: "brand" | "energy" | "cyan" | "violet";
  hint?: string;
}) {
  const accents = {
    brand: "text-brand",
    energy: "text-energy",
    cyan: "text-brand-3",
    violet: "text-brand-2",
  } as const;

  return (
    <div className="card p-3.5">
      <p className="text-[10px] font-bold uppercase tracking-[0.11em] text-faint">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("text-2xl font-extrabold tabular-nums", accents[accent])}>{value}</span>
        {suffix ? <span className="text-xs font-semibold text-muted">{suffix}</span> : null}
      </p>
      {hint ? <p className="mt-0.5 text-[11px] text-faint">{hint}</p> : null}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-10 text-center">
      {icon ? (
        <div className="grid size-12 place-items-center rounded-2xl bg-surface-2 text-brand">
          {icon}
        </div>
      ) : null}
      <div>
        <p className="font-semibold text-fg">{title}</p>
        {description ? (
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function CategoryBadge({ category, className }: { category: string; className?: string }) {
  const meta = CATEGORIES[category as CategoryKey] ?? CATEGORIES.force;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
        className,
      )}
      style={{
        color: meta.color,
        backgroundColor: `color-mix(in oklab, ${meta.color} 16%, transparent)`,
      }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {meta.label}
    </span>
  );
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  draft: { label: "Brouillon", className: "border-line bg-surface-2 text-muted" },
  published: { label: "Prête", className: "border-energy/40 bg-energy/12 text-energy" },
  done: { label: "Terminée", className: "border-brand-2/40 bg-brand-2/12 text-brand-2" },
};

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_STYLES[status] ?? STATUS_STYLES.draft;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        meta.className,
      )}
    >
      {meta.label}
    </span>
  );
}

export function ProgressBar({
  value,
  max,
  className,
  tone = "brand",
}: {
  value: number;
  max: number;
  className?: string;
  tone?: "brand" | "energy";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-3", className)}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          backgroundImage:
            tone === "energy"
              ? "linear-gradient(90deg, var(--color-energy), #8fe63a)"
              : "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))",
        }}
      />
    </div>
  );
}

export function Ring({
  value,
  max,
  size = 62,
  stroke = 6,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, value / max) : 0;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id="ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-brand)" />
            <stop offset="100%" stopColor="var(--color-brand-2)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--color-surface-3)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#ring-grad)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct)}
          className="transition-[stroke-dashoffset] duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-bold">{children}</div>
    </div>
  );
}
