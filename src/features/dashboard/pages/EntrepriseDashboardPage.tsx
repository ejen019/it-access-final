// =============================================================
// EntrepriseDashboardPage — Tableau de bord entreprise
// Style unifié : flat, compact, propre (même que SudoDashboard).
// =============================================================
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Monitor, AlertTriangle, Wrench, PenLine, ArrowRight, Copy, CheckCircle2, Building2 } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useCompanyEquipment } from '@/features/equipment/hooks/useEquipment'
import { useCompanyInterventions } from '@/features/interventions/hooks/useInterventions'
import { SimpleBarChart } from '@/components/shared/SimpleBarChart'

async function fetchMyCompany(userId: string) {
  const { data } = await supabase
    .from('companies')
    .select('id, company_name, validation_code, contract_id')
    .eq('user_id', userId)
    .single()
  return data
}

async function fetchContract(contractId: string) {
  const { data } = await supabase
    .from('contracts').select('*').eq('id', contractId).single()
  return data
}

function StatCard({ icon: Icon, label, value, sub, alert }: {
  icon: any; label: string; value: number; sub?: string; alert?: boolean
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 ${alert && value > 0 ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${alert && value > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/8'}`}>
        <Icon size={17} className={alert && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className={`text-[10px] mt-0.5 font-medium ${alert && value > 0 ? 'text-amber-600' : 'text-muted-foreground/70'}`}>{sub}</p>}
      </div>
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

const STATUS_LABEL: Record<string, string> = {
  active: 'Active', en_cours: 'En cours',
  en_attente_validation: 'En attente', cloturee: 'Clôturée', annulee: 'Annulée',
}
const STATUS_CLASS: Record<string, string> = {
  active: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  en_cours: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  en_attente_validation: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  cloturee: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  annulee: 'bg-muted text-muted-foreground',
}

export function EntrepriseDashboardPage() {
  const { profile } = useAuthStore()
  const [codeCopied, setCodeCopied] = useState(false)

  const { data: company } = useQuery({
    queryKey: ['my-company', profile?.id],
    queryFn: () => fetchMyCompany(profile!.id),
    enabled: !!profile,
  })
  const { data: contract } = useQuery({
    queryKey: ['my-contract', company?.contract_id],
    queryFn: () => fetchContract(company!.contract_id!),
    enabled: !!company?.contract_id,
  })
  const { data: equipment = [] } = useCompanyEquipment(company?.id)
  const { data: interventions = [] } = useCompanyInterventions(company?.id)

  const pannes       = equipment.filter((e) => e.status === 'en_panne').length
  const toSign       = interventions.filter((i: any) => i.status === 'en_attente_validation').length
  const activeInterv = interventions.filter((i: any) => ['active', 'en_cours'].includes(i.status)).length
  const recentes     = [...interventions].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 4)

  async function copyCode() {
    if (!company?.validation_code) return
    await navigator.clipboard.writeText(company.validation_code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 2000)
  }

  return (
    <div className="p-4 space-y-5 page-transition">

      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
          <Building2 size={17} className="text-primary" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{getGreeting()}, {profile?.full_name?.split(' ')[0]}</p>
          <h1 className="text-lg font-bold text-foreground leading-tight">{company?.company_name ?? 'Mon Espace'}</h1>
        </div>
      </div>

      {/* Alertes actives */}
      {toSign > 0 && (
        <Link to="/entreprise/interventions"
          className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-3">
          <div className="w-8 h-8 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <PenLine size={16} className="text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-purple-700 dark:text-purple-400">
              {toSign} intervention{toSign > 1 ? 's' : ''} à signer
            </p>
            <p className="text-xs text-purple-500">Appuyer pour signer et clôturer</p>
          </div>
          <ArrowRight size={14} className="text-purple-400" />
        </Link>
      )}

      {pannes > 0 && (
        <Link to="/entreprise/parc"
          className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3">
          <div className="w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {pannes} équipement{pannes > 1 ? 's' : ''} en panne
            </p>
            <p className="text-xs text-red-500">Voir le parc informatique</p>
          </div>
          <ArrowRight size={14} className="text-red-400" />
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={Monitor} label="Équipements" value={equipment.length}
          sub={pannes > 0 ? `${pannes} en panne` : 'Tous opérationnels'}
          alert={pannes > 0}
        />
        <StatCard
          icon={Wrench} label="Interventions" value={interventions.length}
          sub={activeInterv > 0 ? `${activeInterv} en cours` : 'Aucune en cours'}
          alert={activeInterv > 0}
        />
      </div>
      <SimpleBarChart
        title="Utilisation"
        items={[
          { label: 'Equipements total', value: equipment.length, tone: 'primary' },
          { label: 'Equipements en panne', value: pannes, tone: 'danger' },
          { label: 'Interventions actives', value: activeInterv, tone: 'warning' },
          { label: 'Interventions a signer', value: toSign, tone: 'success' },
        ]}
      />

      {/* Accès rapide */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Actions rapides</p>
        <div className="space-y-2">
          {[
            { to: '/entreprise/parc', icon: Monitor, label: 'Mon parc', sub: `${equipment.length} équipement${equipment.length > 1 ? 's' : ''}` },
            { to: '/entreprise/interventions', icon: Wrench, label: 'Mes interventions', sub: `${interventions.length} au total` },
          ].map(({ to, icon: Icon, label, sub }) => (
            <Link key={to} to={to}
              className="flex items-center gap-3 bg-card border border-border rounded-lg p-3.5 hover:bg-accent hover:border-primary/30 transition-all group">
              <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
                <Icon size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{sub}</p>
              </div>
              <ArrowRight size={14} className="text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Code de validation */}
      {company?.validation_code && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Code de validation</p>
            <button onClick={copyCode}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
              {codeCopied ? <CheckCircle2 size={12} className="text-emerald-500" /> : <Copy size={12} />}
              {codeCopied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <div className="px-4 py-3">
            <p className="font-mono text-xl font-bold text-foreground tracking-widest">
              {company.validation_code}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Donnez ce code au technicien pour valider une intervention
            </p>
          </div>
        </div>
      )}

      {/* Contrat */}
      {contract && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">Contrat {contract.plan}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              contract.is_active ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
            }`}>
              {contract.is_active ? 'Actif' : 'Expiré'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Expire le {new Date(contract.end_date).toLocaleDateString('fr-FR')}
          </p>
          {contract.max_equipment && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Équipements</span>
                <span>{equipment.length} / {contract.max_equipment}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (equipment.length / contract.max_equipment) * 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Interventions récentes */}
      {recentes.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Interventions récentes</p>
            <Link to="/entreprise/interventions"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Tout voir <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentes.map((inv: any) => (
              <Link key={inv.id} to={`/entreprise/interventions/${inv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
                <p className="text-sm text-foreground flex-1 truncate">{inv.title}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CLASS[inv.status] ?? ''}`}>
                  {STATUS_LABEL[inv.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
