"use client";

import { useActionState, useEffect, useState } from "react";
import { Delete, Loader2, Sparkles, UserRound } from "lucide-react";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"];

export function LoginForm({ next, athleteName }: { next?: string; athleteName: string }) {
  const [role, setRole] = useState<"athlete" | "coach">("athlete");
  const [pin, setPin] = useState("");
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});

  useEffect(() => {
    if (state.error) setPin("");
  }, [state.error]);

  const press = (key: string) => {
    if (pending) return;
    if (key === "back") setPin((p) => p.slice(0, -1));
    else if (key === "clear") setPin("");
    else setPin((p) => (p.length >= 8 ? p : p + key));
  };

  return (
    <form action={formAction} className="animate-[var(--animate-rise)]">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="pin" value={pin} />
      <input type="hidden" name="next" value={next ?? ""} />

      <div className="mb-6 grid grid-cols-2 gap-2.5">
        <ProfileButton
          active={role === "athlete"}
          onClick={() => setRole("athlete")}
          icon={<UserRound className="size-5" />}
          label={athleteName || "Athlète"}
          hint="Je m'entraîne"
        />
        <ProfileButton
          active={role === "coach"}
          onClick={() => setRole("coach")}
          icon={<Sparkles className="size-5" />}
          label="Coach"
          hint="Je prépare"
        />
      </div>

      <div className="mb-5 flex items-center justify-center gap-2.5" aria-label="Code saisi">
        {Array.from({ length: Math.max(4, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "size-3 rounded-full transition-all duration-200",
              i < pin.length
                ? "scale-110 bg-gradient-to-br from-brand to-brand-2"
                : "bg-surface-3",
            )}
          />
        ))}
      </div>

      {state.error ? (
        <p className="mb-4 animate-[var(--animate-pop)] text-center text-sm font-medium text-danger">
          {state.error}
        </p>
      ) : (
        <p className="mb-4 text-center text-sm text-faint">Entre ton code d'accès</p>
      )}

      <div className="grid grid-cols-3 gap-2.5">
        {KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => press(key)}
            className={cn(
              "grid h-14 place-items-center rounded-2xl border border-line/70 bg-surface/70 text-xl font-bold",
              "transition-all active:scale-95 active:bg-surface-3",
              key === "clear" && "text-xs font-semibold uppercase tracking-wide text-faint",
              key === "back" && "text-muted",
            )}
          >
            {key === "back" ? <Delete className="size-5" /> : key === "clear" ? "Effacer" : key}
          </button>
        ))}
      </div>

      <button type="submit" disabled={pending || pin.length < 3} className="btn-primary mt-5 w-full">
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {pending ? "Connexion…" : "C'est parti"}
      </button>
    </form>
  );
}

function ProfileButton({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-2 rounded-2xl border p-3.5 text-left transition-all duration-200",
        active
          ? "border-brand/60 bg-gradient-to-br from-brand/18 to-brand-2/10 shadow-[0_10px_36px_-20px_var(--color-brand)]"
          : "border-line bg-surface/60 hover:border-line",
      )}
    >
      <span className={cn("transition-colors", active ? "text-brand" : "text-faint")}>{icon}</span>
      <span>
        <span className="block truncate text-sm font-bold">{label}</span>
        <span className="block text-[11px] text-faint">{hint}</span>
      </span>
    </button>
  );
}
