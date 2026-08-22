"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Plus, X } from "lucide-react";
import { formatDuration } from "@/lib/utils";

/** Petit bip de fin de repos (déclenché après une interaction, donc autorisé). */
function beep() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
    osc.start();
    osc.stop(ctx.currentTime + 0.46);
    setTimeout(() => void ctx.close(), 700);
  } catch {
    /* le son n'est pas indispensable */
  }
}

export function RestTimer({
  seconds,
  label,
  onClose,
}: {
  seconds: number;
  label?: string;
  onClose: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const [total, setTotal] = useState(seconds);
  const [running, setRunning] = useState(true);
  const firedRef = useRef(false);

  useEffect(() => {
    setRemaining(seconds);
    setTotal(seconds);
    setRunning(true);
    firedRef.current = false;
  }, [seconds]);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setRemaining((r) => r - 1), 1000);
    return () => clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (remaining > 0 || firedRef.current) return;
    firedRef.current = true;
    beep();
    navigator.vibrate?.([120, 60, 120]);
    const id = setTimeout(onClose, 2500);
    return () => clearTimeout(id);
  }, [remaining, onClose]);

  const done = remaining <= 0;
  const pct = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;

  return (
    <div className="pointer-events-auto animate-[var(--animate-pop)] overflow-hidden rounded-2xl border border-line/80 bg-ink-2/95 shadow-[0_-8px_44px_-14px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
      <div className="h-1 w-full bg-surface-3">
        <div
          className="h-full transition-[width] duration-1000 ease-linear"
          style={{
            width: `${pct * 100}%`,
            backgroundImage: done
              ? "linear-gradient(90deg, var(--color-energy), #8fe63a)"
              : "linear-gradient(90deg, var(--color-brand), var(--color-brand-2))",
          }}
        />
      </div>
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-faint">
            {done ? "Repos terminé — on y retourne 💪" : "Repos"}
          </p>
          <p className="truncate text-[13px] text-muted">{label}</p>
        </div>
        <span
          className={`tabular-nums text-2xl font-extrabold ${done ? "text-energy" : "text-fg"}`}
        >
          {done ? "GO" : formatDuration(remaining)}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setRemaining((r) => r + 15)}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Ajouter 15 secondes"
          >
            <Plus className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setRunning((r) => !r)}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label={running ? "Mettre en pause" : "Reprendre"}
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl border border-line bg-surface-2 text-muted"
            aria-label="Passer le repos"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
