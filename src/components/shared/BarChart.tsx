// =============================================================
// BarChart — graphe à barres verticales SVG maison (zéro dépendance)
// Axe Y implicite, libellés sous chaque barre, valeur au sommet.
// =============================================================

export interface BarDatum {
  label: string
  value: number
  color?: string // défaut : hsl(var(--primary))
}

interface BarChartProps {
  title?: string
  data: BarDatum[]
  height?: number
}

export function BarChart({ title, data, height = 160 }: BarChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const padTop = 18 // espace pour la valeur au-dessus de la barre
  const plotH = height - padTop

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {title && (
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      )}
      <div className="flex items-end justify-around gap-2" style={{ height }}>
        {data.map((d) => {
          const barH = Math.round((d.value / max) * plotH)
          return (
            <div key={d.label} className="flex-1 min-w-0 flex flex-col items-center justify-end h-full">
              <span className="text-[11px] font-semibold text-foreground mb-1 tabular-nums">{d.value}</span>
              <div
                className="w-full max-w-[44px] rounded-t-md transition-all duration-500"
                style={{
                  height: Math.max(d.value > 0 ? 4 : 0, barH),
                  backgroundColor: d.color ?? 'hsl(var(--primary))',
                }}
              />
              <span className="text-[10px] text-muted-foreground mt-1.5 text-center leading-tight truncate w-full">
                {d.label}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
