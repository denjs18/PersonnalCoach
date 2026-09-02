"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Dumbbell,
  History,
  LineChart,
  Settings,
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: typeof Dumbbell; exact?: boolean };

const ATHLETE_ITEMS: NavItem[] = [
  { href: "/app", label: "Séances", icon: Dumbbell, exact: true },
  { href: "/app/niveaux", label: "Niveaux", icon: Trophy },
  { href: "/app/progression", label: "Progrès", icon: LineChart },
  { href: "/app/historique", label: "Historique", icon: History },
];

const COACH_ITEMS: NavItem[] = [
  { href: "/coach", label: "Planning", icon: CalendarDays, exact: true },
  { href: "/coach/exercices", label: "Exercices", icon: BookOpen },
  { href: "/coach/suivi", label: "Suivi", icon: LineChart },
  { href: "/coach/reglages", label: "Réglages", icon: Settings },
];

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}

export function BottomNav({ variant, extra }: { variant: "athlete" | "coach"; extra?: NavItem[] }) {
  const pathname = usePathname();
  const items = [...(variant === "athlete" ? ATHLETE_ITEMS : COACH_ITEMS), ...(extra ?? [])];

  return (
    <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pt-2">
      <div className="pointer-events-auto flex w-full max-w-md items-stretch gap-1 rounded-2xl border border-line/80 bg-ink-2/85 p-1.5 shadow-[0_-8px_40px_-12px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition-colors",
                active ? "text-fg" : "text-faint hover:text-muted",
              )}
            >
              {active ? (
                <span
                  aria-hidden
                  className="absolute inset-0 rounded-xl bg-gradient-to-b from-brand/22 to-brand-2/12 ring-1 ring-brand/25"
                />
              ) : null}
              <Icon className="relative size-[19px]" strokeWidth={active ? 2.4 : 1.9} />
              <span className="relative">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function TopBar({
  title,
  subtitle,
  right,
  role,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  role?: "coach" | "athlete";
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 border-b border-line/50 bg-ink/70 px-4 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))] backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          {subtitle ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-faint">
              {subtitle}
            </p>
          ) : null}
          <h1 className="truncate text-xl font-extrabold tracking-tight">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {right}
          {role ? (
            <Link
              href="/compte"
              aria-label="Mon compte"
              className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted transition hover:text-fg"
            >
              {role === "coach" ? (
                <Sparkles className="size-4" />
              ) : (
                <UserRound className="size-4" />
              )}
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}
