// =============================================================
// InterventionsEntreprisePage — Interventions de l'entreprise
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, AlertTriangle, PenLine } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useInterventionsClient } from '../hooks/useInterventions'

async function fetchMyClientId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('clients')
    .select('id')
    .eq('utilisateur_id', userId)
    .single()
  return data?.id ?? null
}

const STATUS_LABEL: Record<string, string> = {
  en_attente: 'En attente',
  planifiee: 'Planifiée',
  en_cours: 'En cours',
  terminee: 'À signer',
  signee: 'Signée',
  annulee: 'Annulée',
}

const STATUS_CLASS: Record<string, string> = {
  en_attente: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  planifiee: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  en_cours: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  terminee: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  signee: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  annulee: 'bg-muted text-muted-foreground',
}

function isEnAttente(i: any) {
  return i.statut === 'planifiee' && (!i.interventions_techniciens || i.interventions_techniciens.length === 0)
}
function displayStatut(i: any): string {
  return isEnAttente(i) ? 'en_attente' : i.statut
}

const URGENCY_BORDER: Record<string, string> = {
  faible: 'border-l-slate-400',
  moyenne: 'border-l-amber-400',
  critique: 'border-l-red-500',
}

type StatusFilter = 'all' | 'en_attente' | 'planifiee' | 'en_cours' | 'terminee' | 'signee'

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function InterventionsEntreprisePage() {
  const { profile } = useAuthStore()
  const [filter, setFilter] = useState<StatusFilter>('all')

  const { data: clientId } = useQuery({
    queryKey: ['my-client-id', profile?.id],
    queryFn: () => fetchMyClientId(profile!.id),
    enabled: !!profile,
  })

  const { data: interventions = [], isLoading } = useInterventionsClient(clientId ?? undefined)

  const toSign = interventions.filter((i: any) => i.statut === 'terminee').length

  const filtered = filter === 'all'
    ? interventions
    : interventions.filter((i: any) => displayStatut(i) === filter)

  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 page-transition">
      <div>
        <h1 className="text-xl font-bold text-foreground">Interventions</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {interventions.length} intervention{interventions.length > 1 ? 's' : ''}
          {toSign > 0 && ` · ${toSign} à signer`}
        </p>
      </div>

      {/* Alerte signature en attente */}
      {toSign > 0 && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-3 flex items-center gap-3">
          <PenLine size={18} className="text-purple-500 flex-shrink-0" />
          <p className="text-sm text-purple-700 dark:text-purple-300">
            {toSign > 1 ? `${toSign} interventions attendent` : '1 intervention attend'} votre signature
          </p>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {([
          ['all',        'Toutes'],
          ['en_attente', 'En attente'],
          ['planifiee',  'Planifiées'],
          ['en_cours',   'En cours'],
          ['terminee',   'À signer'],
          ['signee',     'Signées'],
        ] as [StatusFilter, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilter(val)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === val
                ? val === 'en_attente'
                  ? 'bg-amber-500 text-white'
                  : 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Liste */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-2">
          <CheckCircle2 size={40} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Aucune intervention</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((i: any) => (
            <Link
              key={i.id}
              to={`/entreprise/interventions/${i.id}`}
              className={`block bg-card border border-border border-l-4 ${URGENCY_BORDER[i.urgence] ?? ''} rounded-xl p-4 hover:shadow-sm transition-all`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground line-clamp-1">{i.titre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{i.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[displayStatut(i)] ?? ''}`}>
                    {STATUS_LABEL[displayStatut(i)]}
                  </span>
                  {i.statut === 'terminee' && (
                    <PenLine size={14} className="text-purple-500" />
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3 mt-2">
                {i.urgence === 'critique' && (
                  <span className="flex items-center gap-1 text-xs text-red-500 font-medium">
                    <AlertTriangle size={11} />
                    Critique
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {(i.interventions_equipements?.length ?? 0)} équipement{(i.interventions_equipements?.length ?? 0) > 1 ? 's' : ''}
                </span>
                <span className="text-xs text-muted-foreground ml-auto">{formatDate(i.cree_le)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
