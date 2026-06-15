// =============================================================
// SudoInterventionsPage — Vue globale des interventions (Super Admin)
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react'
import { useToutesInterventions } from '../../../features/interventions/hooks/useInterventions'

// ----- Helpers -----

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'Terminée',
  signee: 'Signée',
  annulee: 'Annulée',
}
const STATUS_CLASS: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  planifiee: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  terminee: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  signee: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  annulee: 'bg-muted text-muted-foreground',
}
const URGENCY_LABEL: Record<string, string> = { faible: 'Faible', moyenne: 'Moyenne', critique: 'Critique' }
const URGENCY_CLASS: Record<string, string> = {
  faible: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  moyenne: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  critique: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}
const URGENCY_BORDER: Record<string, string> = {
  faible: 'border-l-slate-400',
  moyenne: 'border-l-amber-400',
  critique: 'border-l-red-500',
}

function isEnAttente(i: any) {
  return i.statut === 'planifiee' && (!i.interventions_techniciens || i.interventions_techniciens.length === 0)
}
function displayStatut(i: any): string {
  return isEnAttente(i) ? 'en_attente' : i.statut
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

type StatusFilter = '' | 'en_attente' | 'planifiee' | 'en_cours' | 'terminee' | 'signee' | 'annulee'

// ----- Page -----

export function SudoInterventionsPage() {
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<StatusFilter>('')
  const [filterUrgency, setFilterUrgency] = useState('')

  const { data: interventions = [], isLoading, isFetching, refetch } = useToutesInterventions()

  const filtered = interventions.filter((i: any) => {
    const s = search.toLowerCase()
    const matchSearch = !s ||
      (i.titre ?? '').toLowerCase().includes(s) ||
      (i.clients?.nom_entreprise ?? '').toLowerCase().includes(s)
    const matchStatus = !filterStatus || displayStatut(i) === filterStatus
    const matchUrgency = !filterUrgency || i.urgence === filterUrgency
    return matchSearch && matchStatus && matchUrgency
  })

  const counts = {
    en_attente: interventions.filter((i: any) => isEnAttente(i)).length,
    active: interventions.filter((i: any) => ['planifiee', 'en_cours'].includes(i.statut)).length,
    critique: interventions.filter((i: any) => i.urgence === 'critique' && ['planifiee', 'en_cours'].includes(i.statut)).length,
  }

  const STATUS_BTNS: [StatusFilter, string][] = [
    ['', 'Tous'],
    ['en_attente', 'En attente'],
    ['planifiee', 'Planifiées'],
    ['en_cours', 'En cours'],
    ['terminee', 'Terminées'],
    ['signee', 'Signées'],
    ['annulee', 'Annulées'],
  ]

  return (
    <div className="space-y-5 page-transition">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Interventions</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {interventions.length} au total
            {counts.critique > 0 && <span className="text-red-500 ml-2">· {counts.critique} critique{counts.critique > 1 ? 's' : ''}</span>}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Actualiser
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'En attente', value: counts.en_attente, color: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
          { label: 'Actives',    value: counts.active,     color: 'text-blue-600 dark:text-blue-400',   bar: 'bg-blue-500' },
          { label: 'Critiques',  value: counts.critique,   color: 'text-red-600 dark:text-red-400',     bar: 'bg-red-500', alert: counts.critique > 0 },
        ].map(({ label, value, color, bar, alert }) => (
          <div key={label}
            className={`bg-card border rounded-xl p-4 ${alert ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <div className={`h-0.5 w-8 rounded-full ${bar} mt-1 mb-1`} />
            <p className="text-xs text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          placeholder="Rechercher titre, entreprise…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Filtres statut + urgence */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_BTNS.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterStatus(val)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === val
                ? val === 'en_attente'
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
            {val === 'en_attente' && counts.en_attente > 0 && (
              <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                filterStatus === 'en_attente' ? 'bg-white/20' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
              }`}>
                {counts.en_attente}
              </span>
            )}
          </button>
        ))}
        <div className="ml-auto">
          <select
            value={filterUrgency}
            onChange={(e) => setFilterUrgency(e.target.value)}
            className="px-3 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Toutes urgences</option>
            <option value="faible">Faible</option>
            <option value="moyenne">Moyenne</option>
            <option value="critique">Critique</option>
          </select>
        </div>
      </div>

      {/* Liste */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Aucune intervention trouvée</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv: any) => {
            const ds = displayStatut(inv)
            return (
              <div
                key={inv.id}
                className={`bg-card border border-border border-l-4 ${URGENCY_BORDER[inv.urgence] ?? ''} rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{inv.titre}</p>
                      {inv.urgence === 'critique' && (
                        <AlertTriangle size={13} className="text-red-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.clients?.nom_entreprise ?? '—'} · {formatDate(inv.cree_le)}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[ds] ?? ''}`}>
                      {STATUS_LABEL[ds] ?? ds}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_CLASS[inv.urgence] ?? ''}`}>
                      {URGENCY_LABEL[inv.urgence] ?? inv.urgence}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Link
                    to={`/sudo/interventions/${inv.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                  >
                    <ExternalLink size={12} />
                    Voir le détail
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Compteur résultats */}
      {!isLoading && filtered.length > 0 && (
        <p className="text-xs text-muted-foreground text-center pb-2">
          {filtered.length} intervention{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
        </p>
      )}
    </div>
  )
}
