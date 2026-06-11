// =============================================================
// TechnicienDashboardPage — Tableau de bord technicien
// Style unifié : flat, compact, propre (même que SudoDashboard).
// =============================================================
import { Link } from 'react-router-dom'
import { Wrench, Clock, ArrowRight, AlertTriangle, QrCode } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useInterventionsTechnicien } from '@/features/interventions/hooks/useInterventions'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { SimpleBarChart } from '@/components/shared/SimpleBarChart'

async function fetchAssignedCompanies(profileId: string) {
  const { data: tech } = await supabase
    .from('techniciens').select('id').eq('utilisateur_id', profileId).single()
  if (!tech) return []
  const { data } = await supabase
    .from('affectations').select('clients(id, nom_entreprise)').eq('technicien_id', tech.id)
  return (data ?? []).map((a: any) => a.clients).filter(Boolean)
}

function StatCard({ icon: Icon, label, value, alert }: {
  icon: any; label: string; value: number; alert?: boolean
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 ${alert && value > 0 ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${alert && value > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/8'}`}>
        <Icon size={17} className={alert && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
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
  planifiee: 'Planifiée', en_cours: 'En cours',
  terminee: 'À signer', signee: 'Clôturée', annulee: 'Annulée',
}
const STATUS_CLASS: Record<string, string> = {
  planifiee: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
  en_cours: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300',
  terminee: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300',
  signee: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
  annulee: 'bg-muted text-muted-foreground',
}
const URGENCY_DOT: Record<string, string> = {
  faible: 'bg-emerald-400', moyenne: 'bg-amber-400', critique: 'bg-red-500',
}

export function TechnicienDashboardPage() {
  const { profile } = useAuthStore()
  const { data: interventions = [] } = useInterventionsTechnicien(profile?.id)
  const { data: companies = [] } = useQuery({
    queryKey: ['tech-companies', profile?.id],
    queryFn: () => fetchAssignedCompanies(profile!.id),
    enabled: !!profile,
  })

  const active    = interventions.filter((i: any) => i.statut === 'planifiee').length
  const enCours   = interventions.filter((i: any) => i.statut === 'en_cours').length
  const enAttente = interventions.filter((i: any) => i.statut === 'terminee').length
  const cloturees = interventions.filter((i: any) => i.statut === 'signee').length
  const urgentes  = interventions.filter((i: any) => i.urgence === 'critique' && ['planifiee', 'en_cours'].includes(i.statut))
  const recentes  = [...interventions].sort((a: any, b: any) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime()).slice(0, 4)

  return (
    <div className="p-4 space-y-5 page-transition">

      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">{getGreeting()}</p>
        <h1 className="text-xl font-bold text-foreground">{profile?.nom}</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {companies.length} entreprise{companies.length > 1 ? 's' : ''} assignée{companies.length > 1 ? 's' : ''}
        </p>
      </div>

      {/* Alerte critique */}
      {urgentes.length > 0 && (
        <Link
          to="/technicien/interventions"
          className="flex items-center gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3"
        >
          <div className="w-8 h-8 rounded-md bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {urgentes.length} mission{urgentes.length > 1 ? 's' : ''} critique{urgentes.length > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-red-500">Intervention urgente en attente</p>
          </div>
          <ArrowRight size={14} className="text-red-400" />
        </Link>
      )}

      {/* Stats */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Mes missions</p>
        <div className="grid grid-cols-2 gap-2.5">
          <StatCard icon={Wrench} label="Actives"              value={active} />
          <StatCard icon={Wrench} label="En cours"             value={enCours} />
          <StatCard icon={Clock}  label="En attente signature" value={enAttente} alert />
          <StatCard icon={Wrench} label="Clôturées"            value={cloturees} />
        </div>
      </div>
      <SimpleBarChart
        title="Flux des missions"
        items={[
          { label: 'Actives', value: active, tone: 'warning' },
          { label: 'En cours', value: enCours, tone: 'primary' },
          { label: 'En attente signature', value: enAttente, tone: 'danger' },
          { label: 'Cloturees', value: cloturees, tone: 'success' },
        ]}
      />

      {/* Accès rapide */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2.5">Actions rapides</p>
        <div className="space-y-2">
          <Link
            to="/technicien/interventions"
            className="flex items-center gap-3 bg-card border border-border rounded-lg p-3.5 hover:bg-accent hover:border-primary/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
              <Wrench size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Mes interventions</p>
              <p className="text-xs text-muted-foreground">{interventions.length} au total</p>
            </div>
            {(active + enCours) > 0 && (
              <span className="min-w-[20px] h-5 flex items-center justify-center bg-primary text-primary-foreground text-xs font-bold rounded-full px-1.5">
                {active + enCours}
              </span>
            )}
            <ArrowRight size={14} className="text-muted-foreground" />
          </Link>

          <Link
            to="/technicien/scanner"
            className="flex items-center gap-3 bg-card border border-border rounded-lg p-3.5 hover:bg-accent hover:border-primary/30 transition-all group"
          >
            <div className="w-8 h-8 rounded-md bg-primary/8 flex items-center justify-center flex-shrink-0">
              <QrCode size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">Scanner un QR code</p>
              <p className="text-xs text-muted-foreground">Accéder au passeport équipement</p>
            </div>
            <ArrowRight size={14} className="text-muted-foreground" />
          </Link>
        </div>
      </div>

      {/* Missions récentes */}
      {recentes.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Récentes</p>
            <Link to="/technicien/interventions"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Tout voir <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recentes.map((inv: any) => (
              <Link
                key={inv.id}
                to={`/technicien/interventions/${inv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[inv.urgence] ?? 'bg-border'}`} />
                <p className="text-sm text-foreground flex-1 truncate">{inv.titre}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CLASS[inv.statut] ?? ''}`}>
                  {STATUS_LABEL[inv.statut]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
