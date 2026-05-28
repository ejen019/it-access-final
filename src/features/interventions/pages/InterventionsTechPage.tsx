// =============================================================
// InterventionsTechPage — Missions du technicien connecté
//
// Vue mobile-first des interventions assignées.
// Filtres par statut. Lien vers le détail pour agir.
// =============================================================
import { Link } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useTechInterventions } from '../hooks/useInterventions'

const STATUS_LABEL: Record<string, string> = {
  active: 'Active',
  en_cours: 'En cours',
  en_attente_validation: 'En attente',
  cloturee: 'Clôturée',
}

const STATUS_CLASS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  en_attente_validation: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  cloturee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
}

const URGENCY_BORDER: Record<string, string> = {
  faible: 'border-l-slate-400',
  moyenne: 'border-l-amber-400',
  critique: 'border-l-red-500',
}

const URGENCY_LABEL: Record<string, string> = {
  faible: 'Faible', moyenne: 'Moyenne', critique: 'Critique',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function InterventionsTechPage() {
  const { profile } = useAuthStore()
  const { data: interventions = [], isLoading, error } = useTechInterventions(profile?.id)

  const active    = interventions.filter((i: any) => i.status === 'active').length
  const enCours   = interventions.filter((i: any) => i.status === 'en_cours').length
  const enAttente = interventions.filter((i: any) => i.status === 'en_attente_validation').length
  const critiques = interventions.filter((i: any) => i.urgency === 'critique' && ['active', 'en_cours'].includes(i.status)).length

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        <div className="h-24 bg-muted rounded-2xl animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 page-transition">
      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur : {(error as Error).message}
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Mes Missions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
          {enCours > 0 && ` · ${enCours} en cours`}
          {enAttente > 0 && ` · ${enAttente} en attente`}
        </p>
      </div>

      {/* Mini stats */}
      {interventions.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: 'Actives',   value: active,    text: 'text-blue-600 dark:text-blue-400' },
            { label: 'En cours',  value: enCours,   text: 'text-orange-600 dark:text-orange-400' },
            { label: 'Attente',   value: enAttente, text: 'text-purple-600 dark:text-purple-400' },
            { label: 'Critiques', value: critiques, text: 'text-red-600 dark:text-red-400' },
          ].map((s) => (
            <div key={s.label} className="bg-card border border-border rounded-xl p-3 text-center">
              <p className={`text-xl font-bold leading-none ${s.text}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alerte critique */}
      {critiques > 0 && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-3.5">
          <div className="w-8 h-8 bg-gradient-to-br from-red-400 to-rose-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle size={14} className="text-white" />
          </div>
          <p className="text-sm font-medium text-red-700 dark:text-red-400">
            {critiques} intervention{critiques > 1 ? 's' : ''} critique{critiques > 1 ? 's' : ''} en attente
          </p>
        </div>
      )}

      {/* Liste */}
      {interventions.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <CheckCircle2 size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Aucune mission assignée pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {interventions.map((i: any) => (
            <Link
              key={i.id}
              to={`/technicien/interventions/${i.id}`}
              className={`flex items-start gap-0 bg-card border border-border border-l-4 ${URGENCY_BORDER[i.urgency]} rounded-xl overflow-hidden hover:shadow-sm transition-all`}
            >
              <div className="flex-1 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 mb-1">
                      {i.urgency === 'critique' && (
                        <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />
                      )}
                      <p className="text-sm font-semibold text-foreground line-clamp-1">{i.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">{i.companies?.company_name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[i.status]}`}>
                      {STATUS_LABEL[i.status]}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDate(i.created_at)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-muted-foreground">
                    {i.equipment_ids?.length ?? 0} équipement{(i.equipment_ids?.length ?? 0) > 1 ? 's' : ''}
                  </span>
                  <span className="text-muted-foreground/30">·</span>
                  <span className={`text-xs font-medium ${
                    i.urgency === 'critique' ? 'text-red-500' :
                    i.urgency === 'moyenne' ? 'text-amber-600 dark:text-amber-400' :
                    'text-muted-foreground'
                  }`}>{URGENCY_LABEL[i.urgency]}</span>
                </div>
              </div>
              <div className="flex items-center self-stretch px-3 border-l border-border/50 bg-muted/30">
                <ChevronRight size={16} className="text-muted-foreground/60" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
