import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="text-center space-y-4">
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold text-foreground">Page introuvable</h1>
        <p className="text-muted-foreground text-sm">Cette page n'existe pas ou vous n'y avez pas accès.</p>
        <Link to="/" className="inline-block text-sm text-primary hover:underline">
          Retour à l'accueil
        </Link>
      </div>
    </div>
  )
}
