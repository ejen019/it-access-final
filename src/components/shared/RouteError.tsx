import { useRouteError, useNavigate, isRouteErrorResponse } from 'react-router-dom'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

export function RouteError() {
  const error = useRouteError()
  const navigate = useNavigate()

  let message = 'Une erreur inattendue est survenue.'
  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? 'Page introuvable.' : error.statusText || message
  } else if (error instanceof Error) {
    message = error.message
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mx-auto">
          <AlertTriangle size={26} className="text-amber-500" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-lg font-semibold text-foreground">Le réseau fait une pause</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <RefreshCw size={15} /> Recharger
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
          >
            <Home size={15} /> Accueil
          </button>
        </div>
      </div>
    </div>
  )
}
