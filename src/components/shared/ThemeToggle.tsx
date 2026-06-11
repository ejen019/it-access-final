import { Moon, Sun } from 'lucide-react'
import { useUIStore } from '@/stores/ui.store'

export function ThemeToggle() {
  const { theme, setTheme } = useUIStore()
  const isDark = theme === 'dark' ||
    (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className="p-2 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      {isDark ? <Sun size={18} strokeWidth={1.8} /> : <Moon size={18} strokeWidth={1.8} />}
    </button>
  )
}
