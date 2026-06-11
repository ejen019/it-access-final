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

const PLAN_COLOR: Record<string, string> = {
  starter: 'bg-slate-600',
  medium:  'bg-blue-600',
  premium: 'bg-violet-600',
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-5 shadow-xl">
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
                  const c = PLAN_COLOR[ab.plan] ?? PLAN_COLOR.starter
                  const isSelected = abonnementId === ab.id
                  return (
                    <button
                      key={ab.id}
                      type="button"
                      onClick={() => setAbonnementId(ab.id)}
                      className={`border-2 rounded-xl p-3 text-left transition-all ${
                        isSelected
                          ? `border-transparent ${c} shadow-sm`
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <p className={`font-semibold text-xs capitalize ${isSelected ? 'text-white' : 'text-foreground'}`}>
                        {PLAN_LABEL[ab.plan] ?? ab.plan}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                        {ab.max_equipements} équip. · {ab.max_techniciens} tech.
                      </p>
                      <p className={`text-xs mt-1 font-semibold ${isSelected ? 'text-white/90' : 'text-foreground'}`}>
                        {(ab.montant ?? 0).toLocaleString('fr-FR')}
                        <span className={`font-normal text-[10px] ml-0.5 ${isSelected ? 'text-white/60' : 'text-muted-foreground'}`}> FCFA</span>
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
          className="flex items-center gap-2 px-4 py-2.5 gradient-primary text-white rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
        >
          <Plus size={16} />
          Nouveau contrat
        </button>
      </div>

      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle size={16} className="text-white" />
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
        <div className="space-y-3">
          {contrats.map((contrat: any) => {
            const days = daysUntil(contrat.date_fin)
            const isExpired = days < 0
            const isExpiringSoon = days >= 0 && days <= 30
            const planKey = (contrat.abonnements?.plan ?? 'starter') as TypePlan
            const c = PLAN_COLOR[planKey] ?? PLAN_COLOR.starter

            return (
              <div key={contrat.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className={`relative overflow-hidden ${c} px-5 py-4`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white" />
                  </div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                        <Building2 size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{contrat.clients?.nom_entreprise ?? '—'}</p>
                        <p className="text-white/70 text-xs capitalize">{PLAN_LABEL[planKey] ?? planKey}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">
                        {(contrat.abonnements?.montant ?? 0).toLocaleString('fr-FR')}
                      </p>
                      <p className="text-white/60 text-xs">FCFA / an</p>
                    </div>
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
