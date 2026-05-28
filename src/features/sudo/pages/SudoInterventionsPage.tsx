// =============================================================
// SudoInterventionsPage — Vue globale des interventions (Sudo)
//
// Liste toutes les interventions de toutes les entreprises.
// Filtres : statut, urgence, entreprise, recherche.
// Vue lecture + actions de modération (annuler, rouvrir).
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// ----- Helpers visuels -----

const STATUS_LABEL: Record<string, string> = {
  active: 'Active', en_cours: 'En cours',
  en_attente_validation: 'En attente', cloturee: 'Clôturée', annulee: 'Annulée',
}
const STATUS_CLASS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  en_attente_validation: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  cloturee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  annulee: 'bg-muted text-muted-foreground',
}
const URGENCY_LABEL: Record<string, string> = { faible: 'Faible', moyenne: 'Moyenne', critique: 'Critique' }
const URGENCY_CLASS: Record<string, string> = {
  faible: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  moyenne: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  critique: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

// ----- Fetch -----

async function fetchInterventions(filters: {
  status: string; urgency: string; search: string
}) {
  let q = supabase
    .from('interventions')
    .select('id, title, status, urgency, created_at, closed_at, companies(company_name)')
    .order('created_at', { ascending: false })

  if (filters.status) q = q.eq('status', filters.status)
  if (filters.urgency) q = q.eq('urgency', filters.urgency)

  const { data, error } = await q
  if (error) throw error

  let result = data ?? []
  if (filters.search) {
    const s = filters.search.toLowerCase()
    result = result.filter((i: any) =>
      i.title.toLowerCase().includes(s) ||
      (i.companies?.company_name ?? '').toLowerCase().includes(s)
    )
  }
  return result
}

// ----- Page -----

export function SudoInterventionsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterUrgency, setFilterUrgency] = useState('')

  const { data: interventions = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sudo-interventions', filterStatus, filterUrgency, search],
    queryFn: () => fetchInterventions({ status: filterStatus, urgency: filterUrgency, search }),
  })

  const counts = {
    total: interventions.length,
    active: interventions.filter((i: any) => ['active', 'en_cours'].includes(i.status)).length,
    critique: interventions.filter((i: any) => i.urgency === 'critique' && ['active', 'en_cours'].includes(i.status)).length,
  }

  return (
    <div className="space-y-6 page-transition">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interventions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {counts.total} intervention{counts.total > 1 ? 's' : ''}
            {counts.critique > 0 && <span className="text-red-500 ml-2">· {counts.critique} critique{counts.critique > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: counts.total },
          { label: 'En cours', value: counts.active },
          { label: 'Critiques actives', value: counts.critique, alert: counts.critique > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label}
            className={`bg-card border rounded-lg p-4 ${alert ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
            <p className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[16rem]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Rechercher titre, entreprise…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les statuts</option>
          <option value="active">Active</option>
          <option value="en_cours">En cours</option>
          <option value="en_attente_validation">En attente</option>
          <option value="cloturee">Clôturée</option>
          <option value="annulee">Annulée</option>
        </select>
        <select
          value={filterUrgency}
          onChange={(e) => setFilterUrgency(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes urgences</option>
          <option value="faible">Faible</option>
          <option value="moyenne">Moyenne</option>
          <option value="critique">Critique</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          {(error as Error).message}
        </div>
      )}

      {/* Liste */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : interventions.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucune intervention trouvée</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Titre / Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Urgence</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Créée le</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Lien</th>
                </tr>
              </thead>
              <tbody>
                {interventions.map((inv: any) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground line-clamp-1">{inv.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {inv.companies?.company_name ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CLASS[inv.status] ?? ''}`}>
                        {STATUS_LABEL[inv.status] ?? inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${URGENCY_CLASS[inv.urgency] ?? ''}`}>
                        {URGENCY_LABEL[inv.urgency] ?? inv.urgency}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/sudo/interventions/${inv.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
