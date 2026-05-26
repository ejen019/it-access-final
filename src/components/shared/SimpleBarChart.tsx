interface BarItem {
  label: string;
  value: number;
  color?: string;
}

interface SimpleBarChartProps {
  data: BarItem[];
  height?: number;
  showValues?: boolean;
}

export function SimpleBarChart({ data, height = 80, showValues = true }: SimpleBarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="flex items-end gap-1.5 w-full" style={{ height }}>
      {data.map((item) => {
        const pct = Math.max((item.value / max) * 100, 2);
        return (
          <div key={item.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
            {showValues && (
              <span className="text-[10px] font-medium text-muted-foreground leading-none">
                {item.value}
              </span>
            )}
            <div className="w-full flex-1 flex items-end">
              <div
                className="w-full rounded-t-sm transition-all duration-500 ease-out"
                style={{
                  height: `${pct}%`,
                  minHeight: 4,
                  backgroundColor: item.color ?? 'hsl(var(--primary))',
                }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-none">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
