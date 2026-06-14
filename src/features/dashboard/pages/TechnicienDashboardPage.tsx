// =============================================================
// TechnicienDashboardPage — Tableau de bord technicien
// Style unifié : flat, compact, propre (même que SudoDashboard).
// =============================================================
import { Link } from 'react-router-dom'
import { Wrench, Clock, ArrowRight, AlertTriangle, QrCode } from 'lucide-react'
import { useAuthStore } from '@/stores/auth.store'
import { useInterventionsTechnicien } from '@/features/interventions/hooks/useInterventions'
import { DonutChart } from '@/components/shared/DonutChart'
import { BarChart } from '@/components/shared/BarChart'

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

export function TechnicienDashboardPage() {
  const { profile } = useAuthStore()
  const { data: interventions = [] } = useInterventionsTechnicien(profile?.id)
  const active    = interventions.filter((i: any) => i.statut === 'planifiee').length
  const enCours   = interventions.filter((i: any) => i.statut === 'en_cours').length
  const enAttente = interventions.filter((i: any) => i.statut === 'terminee').length
  const cloturees = interventions.filter((i: any) => i.statut === 'signee').length
  const urgentes  = interventions.filter((i: any) => i.urgence === 'critique' && ['planifiee', 'en_cours'].includes(i.statut))
  const annulees  = interventions.filter((i: any) => i.statut === 'annulee').length

  return (
    <div className="p-4 space-y-5 page-transition">

      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">{getGreeting()}</p>
        <h1 className="text-xl font-bold text-foreground">{profile?.nom}</h1>
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
        <Link to="/technicien/interventions"
          className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
          Voir toutes mes missions <ArrowRight size={11} />
        </Link>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <DonutChart
          title="Répartition de mes missions"
          centerLabel="Missions"
          data={[
            { label: 'Planifiées', value: active, color: '#3b82f6' },
            { label: 'En cours', value: enCours, color: '#f59e0b' },
            { label: 'À signer', value: enAttente, color: '#a855f7' },
            { label: 'Clôturées', value: cloturees, color: '#10b981' },
            { label: 'Annulées', value: annulees, color: '#94a3b8' },
          ]}
        />
        <BarChart
          title="Flux des missions"
          data={[
            { label: 'Planif.', value: active, color: '#3b82f6' },
            { label: 'En cours', value: enCours, color: '#f59e0b' },
            { label: 'À signer', value: enAttente, color: '#a855f7' },
            { label: 'Clôturées', value: cloturees, color: '#10b981' },
          ]}
        />
      </div>

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

    </div>
  )
}
