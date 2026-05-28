// =============================================================
// ContractsPage — Gestion des contrats (Admin)
// Affiche les contrats par entreprise avec quotas et dates
// =============================================================
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, FileText, AlertTriangle, CheckCircle2, Loader2, Building2, Calendar } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { CONTRACT_PLANS, type ContractPlan } from '@/types'
import { fetchPublicConfig } from '@/lib/publicConfig'

async function fetchContractsWithCompanies() {
  const { data, error } = await supabase
    .from('contracts')
    .select(`
      *,
      companies ( id, company_name )
    `)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchCompaniesWithoutContract() {
  const { data: withContract, error: err1 } = await supabase
    .from('contracts')
    .select('company_id')
    .eq('is_active', true)
  if (err1) throw err1

  const usedIds = (withContract ?? []).map((c: any) => c.company_id)
  const query = supabase.from('companies').select('id, company_name').order('company_name')
  const { data, error: err2 } = usedIds.length
    ? await query.not('id', 'in', `(${usedIds.join(',')})`)
    : await query
  if (err2) throw err2
  return data ?? []
}

const PLAN_GRADIENT: Record<ContractPlan, { from: string; to: string; badge: string }> = {
  starter:    { from: 'from-slate-500', to: 'to-slate-600', badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
  medium:     { from: 'from-blue-500',  to: 'to-indigo-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  premium:    { from: 'from-purple-500', to: 'to-violet-600', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  pro:        { from: 'from-blue-500',  to: 'to-indigo-600', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
  enterprise: { from: 'from-purple-500', to: 'to-violet-600', badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
}

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
}

// ----- Modal création contrat -----

interface CreateContractModalProps {
  onClose: () => void
}

function CreateContractModal({ onClose }: CreateContractModalProps) {
  const queryClient = useQueryClient()
  const [companyId, setCompanyId] = useState('')
  const [plan, setPlan] = useState<ContractPlan>('starter')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: companies = [] } = useQuery({
    queryKey: ['companies-without-contract'],
    queryFn: fetchCompaniesWithoutContract,
  })
  const { data: publicConfig } = useQuery({
    queryKey: ['public-config'],
    queryFn: fetchPublicConfig,
  })

  const planRuntime = {
    starter: {
      maxEquipment: publicConfig?.pricing.starter.max_equipment ?? CONTRACT_PLANS.starter.maxEquipment,
      maxTechnicians: publicConfig?.pricing.starter.max_technicians ?? CONTRACT_PLANS.starter.maxTechnicians,
      price: publicConfig?.pricing.starter.price_fcfa ?? CONTRACT_PLANS.starter.price,
    },
    medium: {
      maxEquipment: publicConfig?.pricing.medium.max_equipment ?? CONTRACT_PLANS.medium.maxEquipment,
      maxTechnicians: publicConfig?.pricing.medium.max_technicians ?? CONTRACT_PLANS.medium.maxTechnicians,
      price: publicConfig?.pricing.medium.price_fcfa ?? CONTRACT_PLANS.medium.price,
    },
    premium: {
      maxEquipment: publicConfig?.pricing.premium.max_equipment ?? CONTRACT_PLANS.premium.maxEquipment,
      maxTechnicians: publicConfig?.pricing.premium.max_technicians ?? CONTRACT_PLANS.premium.maxTechnicians,
      price: publicConfig?.pricing.premium.price_fcfa ?? CONTRACT_PLANS.premium.price,
    },
  } as const

  const selectedPlan = (plan === 'starter' || plan === 'medium' || plan === 'premium')
    ? planRuntime[plan]
    : planRuntime.starter

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!companyId) { setError('Choisissez une entreprise.'); return }
    setError(null)
    setCreating(true)

    try {
      const endDate = new Date(startDate)
      endDate.setFullYear(endDate.getFullYear() + 1)

      const { data: contract, error: contractErr } = await supabase
        .from('contracts')
        .insert({
          company_id: companyId,
          plan: (plan === 'starter' || plan === 'medium' || plan === 'premium') ? plan : 'starter',
          max_equipment: selectedPlan.maxEquipment,
          max_technicians: selectedPlan.maxTechnicians,
          price_fcfa: selectedPlan.price,
          start_date: startDate,
          end_date: endDate.toISOString().split('T')[0],
          is_active: true,
        })
        .select()
        .single()
      if (contractErr) throw contractErr

      await supabase.from('companies').update({ contract_id: contract.id }).eq('id', companyId)

      queryClient.invalidateQueries({ queryKey: ['contracts-list'] })
      queryClient.invalidateQueries({ queryKey: ['companies-without-contract'] })
      onClose()
    } catch (err: any) {
      setError(err?.message ?? 'Erreur lors de la création.')
    } finally {
      setCreating(false)
    }
  }

  const planOptions: { key: ContractPlan; icon: string; features: string[] }[] = [
    { key: 'starter', icon: '🌱', features: [`${planRuntime.starter.maxEquipment} équip.`, `${planRuntime.starter.maxTechnicians} tech.`] },
    { key: 'medium', icon: '⚡', features: [`${planRuntime.medium.maxEquipment} équip.`, `${planRuntime.medium.maxTechnicians} tech.`] },
    { key: 'premium', icon: '🏢', features: [`${planRuntime.premium.maxEquipment} équip.`, `${planRuntime.premium.maxTechnicians} tech.`] },
  ]

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
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Choisir une entreprise…</option>
              {companies.map((c: any) => (
                <option key={c.id} value={c.id}>{c.company_name}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Plan</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {planOptions.map((p) => {
                const g = PLAN_GRADIENT[p.key]
                const runtimeInfo = p.key === 'starter' ? planRuntime.starter : p.key === 'medium' ? planRuntime.medium : planRuntime.premium
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => setPlan(p.key)}
                    className={`border-2 rounded-xl p-3 text-left transition-all ${
                      plan === p.key
                        ? `border-transparent bg-gradient-to-br ${g.from} ${g.to} shadow-sm`
                        : 'border-border hover:border-primary/40'
                    }`}
                  >
                    <p className="text-base mb-1">{p.icon}</p>
                    <p className={`font-semibold text-xs capitalize ${plan === p.key ? 'text-white' : 'text-foreground'}`}>
                      {p.key === 'starter' ? 'Starter' : p.key === 'medium' ? 'Medium' : 'Premium'}
                    </p>
                    <p className={`text-xs mt-0.5 ${plan === p.key ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {p.features.join(' · ')}
                    </p>
                    <p className={`text-xs mt-1 font-semibold ${plan === p.key ? 'text-white/90' : 'text-foreground'}`}>
                      {runtimeInfo.price.toLocaleString('fr-FR')}
                      <span className={`font-normal text-[10px] ml-0.5 ${plan === p.key ? 'text-white/60' : 'text-muted-foreground'}`}> FCFA</span>
                    </p>
                  </button>
                )
              })}
            </div>
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
            Durée : 1 an · {plan === 'starter' ? 'Starter' : plan === 'medium' ? 'Medium' : 'Premium'} · {selectedPlan.maxEquipment} équipements max
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

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ['contracts-list'],
    queryFn: fetchContractsWithCompanies,
  })

  const active = contracts.filter((c: any) => c.is_active).length
  const expiringSoon = contracts.filter((c: any) => {
    const days = daysUntil(c.end_date)
    return c.is_active && days >= 0 && days <= 30
  }).length

  async function toggleContractStatus(id: string, isActive: boolean) {
    await supabase.from('contracts').update({ is_active: !isActive }).eq('id', id)
    queryClient.invalidateQueries({ queryKey: ['contracts-list'] })
  }

  return (
    <div className="space-y-6 page-transition">

      {/* En-tête */}
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

      {/* Alertes expiration */}
      {expiringSoon > 0 && (
        <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
            <AlertTriangle size={16} className="text-white" />
          </div>
          <p className="text-sm text-amber-700 dark:text-amber-400 font-medium">
            {expiringSoon} contrat{expiringSoon > 1 ? 's' : ''} expire{expiringSoon > 1 ? 'nt' : ''} dans moins de 30 jours. Pensez au renouvellement.
          </p>
        </div>
      )}

      {/* Liste contrats */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : contracts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <FileText size={28} className="text-muted-foreground/40" />
          </div>
          <p className="text-sm text-muted-foreground">Aucun contrat créé</p>
          <button
            onClick={() => setShowCreate(true)}
            className="text-sm text-primary hover:underline"
          >
            Créer le premier contrat
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {contracts.map((contract: any) => {
            const days = daysUntil(contract.end_date)
            const isExpired = days < 0
            const isExpiringSoon = days >= 0 && days <= 30
            const planKey = contract.plan as ContractPlan
            const g = PLAN_GRADIENT[planKey] ?? PLAN_GRADIENT.starter

            return (
              <div key={contract.id} className="bg-card border border-border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                {/* Header carte avec gradient plan */}
                <div className={`relative overflow-hidden bg-gradient-to-r ${g.from} ${g.to} px-5 py-4`}>
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white" />
                  </div>
                  <div className="relative flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center border border-white/30">
                        <Building2 size={16} className="text-white" />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{contract.companies?.company_name}</p>
                        <p className="text-white/70 text-xs capitalize">{CONTRACT_PLANS[planKey]?.label ?? contract.plan}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-bold text-sm">{contract.price_fcfa.toLocaleString('fr-FR')}</p>
                      <p className="text-white/60 text-xs">FCFA / an</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  {/* Dates */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar size={12} />
                    <span>Du {formatDate(contract.start_date)}</span>
                    <span>→</span>
                    <span className={`font-medium ${isExpired ? 'text-destructive' : isExpiringSoon ? 'text-amber-600' : 'text-foreground'}`}>
                      {formatDate(contract.end_date)}
                      {isExpired && ' · Expiré'}
                      {!isExpired && isExpiringSoon && ` · J-${days}`}
                    </span>
                  </div>

                  {/* Statut + badge */}
                  <div className="flex items-center gap-2">
                    {!contract.is_active ? (
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

                  {/* Quotas */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">Équipements max</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{contract.max_equipment}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-2.5">
                      <p className="text-xs text-muted-foreground">Techniciens max</p>
                      <p className="text-sm font-bold text-foreground mt-0.5">{contract.max_technicians}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => toggleContractStatus(contract.id, contract.is_active)}
                    className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                      contract.is_active
                        ? 'border border-border text-muted-foreground hover:bg-accent'
                        : 'border border-primary/40 text-primary hover:bg-primary/10'
                    }`}
                  >
                    {contract.is_active ? 'Désactiver le contrat' : 'Réactiver le contrat'}
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
