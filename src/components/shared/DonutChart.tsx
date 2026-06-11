// =============================================================
// DonutChart — graphe en anneau SVG maison (zéro dépendance)
// Thémé via couleurs explicites cohérentes avec les badges du projet.
// =============================================================

export interface DonutSlice {
  label: string
  value: number
  color: string // ex. 'hsl(var(--primary))' ou '#10b981'
}

interface DonutChartProps {
  title?: string
  data: DonutSlice[]
  /** Libellé central optionnel (sinon = total) */
  centerLabel?: string
  size?: number
}

export function DonutChart({ title, data, centerLabel, size = 150 }: DonutChartProps) {
  const total = data.reduce((acc, d) => acc + d.value, 0)
  const stroke = Math.round(size * 0.16)
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  // Construit les arcs cumulés
  let offsetAcc = 0
  const arcs = data.map((d) => {
    const fraction = total > 0 ? d.value / total : 0
    const dash = fraction * circumference
    const arc = {
      ...d,
      fraction,
      dashArray: `${dash} ${circumference - dash}`,
      dashOffset: -offsetAcc,
    }
    offsetAcc += dash
    return arc
  })

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      )}
      <div className="flex items-center gap-5">
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            {/* Piste de fond */}
            <circle
              cx={cx} cy={cy} r={radius}
              fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke}
            />
            {total > 0 && arcs.map((a) => (
              <circle
                key={a.label}
                cx={cx} cy={cy} r={radius}
                fill="none"
                stroke={a.color}
                strokeWidth={stroke}
                strokeDasharray={a.dashArray}
                strokeDashoffset={a.dashOffset}
                strokeLinecap="butt"
                className="transition-all duration-500"
              />
            ))}
          </svg>
          {/* Centre */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-foreground leading-none">{total}</span>
            <span className="text-[10px] text-muted-foreground mt-0.5">{centerLabel ?? 'Total'}</span>
          </div>
        </div>

        {/* Légende */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {data.map((d) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0
            return (
              <div key={d.label} className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-foreground truncate flex-1">{d.label}</span>
                <span className="text-muted-foreground tabular-nums">{d.value}</span>
                <span className="text-muted-foreground/60 tabular-nums w-9 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
