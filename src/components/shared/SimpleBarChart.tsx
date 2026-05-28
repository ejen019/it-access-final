interface Item {
  label: string
  value: number
  tone?: 'primary' | 'success' | 'warning' | 'danger'
}

const TONE_CLASS: Record<NonNullable<Item['tone']>, string> = {
  primary: 'bg-blue-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-red-500',
}

export function SimpleBarChart({ title, items }: { title: string; items: Item[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">{title}</p>
      <div className="space-y-2.5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-foreground">{item.label}</span>
              <span className="text-muted-foreground">{item.value}</span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full ${TONE_CLASS[item.tone ?? 'primary']}`}
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

