import { cn } from "@/lib/utils";

export type ChartPoint = { label: string; value: number };

/** Mini courbe sans axes, pour les listes. */
export function Sparkline({
  values,
  className,
  tone = "brand",
}: {
  values: number[];
  className?: string;
  tone?: "brand" | "energy";
}) {
  if (values.length < 2) {
    return <div className={cn("h-8 w-full", className)} />;
  }

  const width = 100;
  const height = 32;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const color = tone === "energy" ? "var(--color-energy)" : "var(--color-brand)";
  const last = points[points.length - 1].split(",");

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className={cn("h-8 w-full overflow-visible", className)}
      aria-hidden
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
      <circle cx={last[0]} cy={last[1]} r={2.6} fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Courbe complète avec repères, utilisée sur la fiche d'un exercice. */
export function ProgressChart({
  points,
  unit,
  height = 190,
  tone = "brand",
}: {
  points: ChartPoint[];
  unit?: string;
  height?: number;
  tone?: "brand" | "violet" | "cyan";
}) {
  if (points.length === 0) {
    return (
      <div className="grid h-40 place-items-center text-sm text-faint">
        Pas encore assez de données.
      </div>
    );
  }

  const colors = {
    brand: "var(--color-brand)",
    violet: "var(--color-brand-2)",
    cyan: "var(--color-brand-3)",
  } as const;
  const color = colors[tone];
  const gradientId = `chart-grad-${tone}`;

  // Une seule séance : une courbe n'aurait aucun sens, on montre la valeur.
  if (points.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 py-7">
        <p className="text-3xl font-extrabold tabular-nums" style={{ color }}>
          {formatValue(points[0].value)}
          {unit ? <span className="ml-1 text-base font-bold text-muted">{unit}</span> : null}
        </p>
        <p className="text-[12px] text-faint">
          {points[0].label} · la courbe apparaîtra à la 2ᵉ séance
        </p>
      </div>
    );
  }

  const width = 320;
  const padX = 9;
  const padTop = 14;
  const padBottom = 22;
  const innerH = height - padTop - padBottom;

  const values = points.map((p) => p.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const min = rawMin === rawMax ? Math.max(0, rawMin - 1) : rawMin;
  const max = rawMin === rawMax ? rawMax + 1 : rawMax;
  const span = max - min || 1;

  const step = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = padX + i * step;
    const y = padTop + innerH - ((p.value - min) / span) * innerH;
    return { x, y, ...p };
  });

  const line = coords.map((c) => `${c.x.toFixed(2)},${c.y.toFixed(2)}`).join(" ");
  const area = `${padX},${padTop + innerH} ${line} ${(padX + (points.length - 1) * step).toFixed(2)},${padTop + innerH}`;

  const showEvery = Math.max(1, Math.ceil(points.length / 4));

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={padX}
            x2={width - padX}
            y1={padTop + innerH * t}
            y2={padTop + innerH * t}
            stroke="var(--color-line)"
            strokeWidth={1}
            strokeDasharray="3 5"
            opacity={0.5}
          />
        ))}

        {points.length > 1 ? <polygon points={area} fill={`url(#${gradientId})`} /> : null}

        {points.length > 1 ? (
          <polyline
            points={line}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {coords.map((c, i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={i === coords.length - 1 ? 4.5 : 3}
            fill={i === coords.length - 1 ? color : "var(--color-ink)"}
            stroke={color}
            strokeWidth={2}
          />
        ))}

        {coords.map((c, i) =>
          i % showEvery === 0 || i === coords.length - 1 ? (
            <text
              key={`label-${i}`}
              x={c.x}
              y={height - 6}
              textAnchor={i === 0 ? "start" : i === coords.length - 1 ? "end" : "middle"}
              fontSize="9"
              fill="var(--color-faint)"
              fontWeight="600"
            >
              {c.label}
            </text>
          ) : null,
        )}
      </svg>

      <div className="mt-1 flex justify-between text-[11px] font-semibold text-faint">
        <span>
          min {formatValue(rawMin)}
          {unit ? ` ${unit}` : ""}
        </span>
        <span style={{ color }}>
          max {formatValue(rawMax)}
          {unit ? ` ${unit}` : ""}
        </span>
      </div>
    </div>
  );
}

function formatValue(v: number): string {
  return Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
}
