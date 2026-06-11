// =============================================================
// ContractsPage — Gestion des contrats (Admin)
// =============================================================
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, AlertTriangle, CheckCircle2, Loader2, Building2, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import type { TypePlan } from '@/types'

async function fetchContrats() {
  const { data, error } = await supabase
    .from('contrats')
    .select('*, clients(id, nom_entreprise), abonnements(plan, max_equipements, max_techniciens, montant)')
    .order('cree_le', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchClientsWithoutContrat() {
  const { data: withContrat } = await supabase
    .from('contrats')
    .select('client_id')
    .eq('est_actif', true)

  const usedIds = (withContrat ?? []).map((c: any) => c.client_id)
  const query = supabase.from('clients').select('id, nom_entreprise').order('nom_entreprise')
  const { data, error } = usedIds.length
    ? await query.not('id', 'in', `(${usedIds.join(',')})`)
    : await query
  if (error) throw error
  return data ?? []
}

async function fetchAbonnements() {
  const { data } = await supabase
    .from('abonnements')
    .select('id, plan, max_equipements, max_techniciens, montant')
  return data ?? []
}

// Styles sobres (pills teintées, cohérents avec les badges du reste de l'app)
const PLAN_PILL: Record<string, string> = {
  starter: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  medium:  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  premium: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
}

const PLAN_LABEL: Record<string, string> = {
  starter: 'Starter', medium: 'Medium', premium: 'Premium',
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ----- Modal création contrat -----

function CreateContractModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const [clientId, setClientId] = useState('')
  const [abonnementId, setAbonnementId] = useState('')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: clients = [] } = useQuery({
    queryKey: ['clients-without-contrat'],
    queryFn: fetchClientsWithoutContrat,
  })
  const { data: abonnements = [] } = useQuery({
    queryKey: ['abonnements-list'],
    queryFn: fetchAbonnements,
  })

  const selectedAbonnement = (abonnements as any[]).find((a) => a.id === abonnementId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!clientId || !abonnementId) { setError("Choisissez une entreprise et un abonnement."); return }
    setError(null)
    setCreating(true)

    try {
      const endDate = new Date(startDate)
      endDate.setFullYear(endDate.getFullYear() + 1)

      const { error: contractErr } = await supabase
        .from('contrats')
        .insert({
          client_id: clientId,
          abonnement_id: abonnementId,
          date_debut: startDate,
          date_fin: endDate.toISOString().split('T')[0],
          est_actif: true,
          nbr_equip_actuel: 0,
          nbr_techniciens_actuel: 0,
        })
      if (contractErr) throw contractErr

      queryClient.invalidateQueries({ queryKey: ['contrats-list'] })
      queryClient.invalidateQueries({ queryKey: ['clients-without-contrat'] })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center p-4">
      <div
        className="bg-card border border-border rounded-2xl w-full max-w-md my-4 p-6 space-y-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center">
            <Plus size={16} className="text-white" />
          </div>
          <h2 className="font-semibold text-foreground">Nouveau contrat</h2>
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2">{error}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Entreprise</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {(clients as any[]).map((c) => (
                <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Abonnement</label>
            {(abonnements as any[]).length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(abonnements as any[]).map((ab) => {
                  const isSelected = abonnementId === ab.id
                  return (
                    <button
                      key={ab.id}
                      type="button"
                      onClick={() => setAbonnementId(ab.id)}
                      className={`border rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <span className={`inline-flex text-[11px] px-1.5 py-0.5 rounded-full font-medium capitalize ${PLAN_PILL[ab.plan] ?? PLAN_PILL.starter}`}>
                        {PLAN_LABEL[ab.plan] ?? ab.plan}
                      </span>
                      <p className="text-xs mt-1.5 text-muted-foreground">
                        {ab.max_equipements} équip. · {ab.max_techniciens} tech.
                      </p>
                      <p className="text-xs mt-1 font-semibold text-foreground">
                        {(ab.montant ?? 0).toLocaleString('fr-FR')}
                        <span className="font-normal text-[10px] ml-0.5 text-muted-foreground"> FCFA</span>
                      </p>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                Aucun abonnement disponible. Créez d'abord des abonnements dans Supabase.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Date de début</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="bg-muted/50 rounded-xl p-3 text-xs text-muted-foreground flex items-center gap-2">
            <Calendar size={13} />
            Durée : 1 an — {selectedAbonnement ? `${selectedAbonnement.max_equipements} équipements max` : 'Sélectionnez un abonnement'}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 px-4 py-2.5 gradient-primary text-white rounded-lg text-sm font-semibold disabled:opacity-60 shadow-sm"
            >
              {creating ? 'Création…' : 'Créer le contrat'}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  )
}

// ----- Page principale -----

export function ContractsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const queryClient = useQueryClient()

  const { data: contrats = [], isLoading } = useQuery({
    queryKey: ['contrats-list'],
    queryFn: fetchContrats,
  })

  const active = contrats.filter((c: any) => c.est_actif).length
  const expiringSoon = contrats.filter((c: any) => {
    const days = daysUntil(c.date_fin)
    return c.est_actif && days >= 0 && days <= 30
  }).length

  async function toggleContratStatus(id: string, isActive: boolean) {
    await supabase.from('contrats').update({ est_actif: !isActive }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['contrats-list'] })
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contrats</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {active} actif{active > 1 ? 's' : ''}
            {expiringSoon > 0 && ` · `}
            {expiringSoon > 0 && <span className="text-amber-600 font-medium">{expiringSoon} expirent bientôt</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus size={16} />
          Nouveau contrat
        </button>
      </div>

      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            {expiringSoon} contrat{expiringSoon > 1 ? 's' : ''} expire{expiringSoon > 1 ? 'nt' : ''} dans moins de 30 jours.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : contrats.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <FileText size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun contrat créé</p>
          <button onClick={() => setShowCreate(true)} className="text-sm text-primary hover:underline">
            Créer le premier contrat
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {contrats.map((contrat: any) => {
            const days = daysUntil(contrat.date_fin)
            const isExpired = days < 0
            const isExpiringSoon = days >= 0 && days <= 30
            const planKey = (contrat.abonnements?.plan ?? 'starter') as TypePlan
            const planPill = PLAN_PILL[planKey] ?? PLAN_PILL.starter

            return (
              <div key={contrat.id} className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between gap-3 px-4 py-3.5 border-b border-border">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${planPill}`}>
                      <Building2 size={16} />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate">{contrat.clients?.nom_entreprise ?? '—'}</p>
                      <span className={`inline-flex text-[11px] px-1.5 py-0.5 rounded-full font-medium capitalize mt-0.5 ${planPill}`}>
                        {PLAN_LABEL[planKey] ?? planKey}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-foreground">
                      {(contrat.abonnements?.montant ?? 0).toLocaleString('fr-FR')}
                    </p>
                    <p className="text-[11px] text-muted-foreground">FCFA / an</p>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>Du {formatDate(contrat.date_debut)}</span>
                    <span>→</span>
                    <span className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-amber-600' : 'text-foreground'}`}>
                      {formatDate(contrat.date_fin)}
                      {isExpired && ' · Expiré'}
                      {!isExpired && isExpiringSoon && ` · J-${days}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!contrat.est_actif ? (
                      <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">Inactif</span>
                    ) : isExpired ? (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full font-medium">Expiré</span>
                    ) : isExpiringSoon ? (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full font-medium">Expire bientôt</span>
                    ) : (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2.5 py-1 rounded-full font-medium flex items-center gap-1">
                        <CheckCircle2 size={10} />Actif
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">Équipements max</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{contrat.abonnements?.max_equipements ?? '—'}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">Techniciens max</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{contrat.abonnements?.max_techniciens ?? '—'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleContratStatus(contrat.id, contrat.est_actif)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      contrat.est_actif
                        ? 'border border-border text-muted-foreground hover:bg-accent'
                        : 'border border-primary/40 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {contrat.est_actif ? 'Désactiver le contrat' : 'Réactiver le contrat'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showCreate && <CreateContractModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
