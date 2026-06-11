// =============================================================
// AdminDashboardPage — Vue d'ensemble Administrateur
// Style unifié avec le SudoDashboard : flat, compact, propre.
// =============================================================
import { useQuery } from '@tanstack/react-query'
import {
  Users, Monitor, Wrench, FileText,
  Clock, AlertTriangle, ArrowRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { DonutChart } from '@/components/shared/DonutChart'
import { BarChart } from '@/components/shared/BarChart'

// ----- Requêtes -----

async function fetchAdminStats() {
  const results = await Promise.all([
    supabase.from('clients').select('*', { count: 'exact', head: true }),
    supabase.from('techniciens').select('*', { count: 'exact', head: true }),
    supabase.from('utilisateurs').select('*', { count: 'exact', head: true })
      .eq('compte_valide', false).in('role', ['client', 'technicien']),
    supabase.from('interventions').select('*', { count: 'exact', head: true })
      .in('statut', ['planifiee', 'en_cours', 'terminee']),
    supabase.from('interventions').select('*', { count: 'exact', head: true })
      .eq('urgence', 'critique').in('statut', ['planifiee', 'en_cours']),
    supabase.from('equipements').select('*', { count: 'exact', head: true }),
    supabase.from('equipements').select('*', { count: 'exact', head: true })
      .eq('etat', 'en_panne'),
    supabase.from('equipements').select('*', { count: 'exact', head: true })
      .eq('etat', 'maintenance'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'planifiee'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'en_cours'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'terminee'),
    supabase.from('interventions').select('*', { count: 'exact', head: true }).eq('statut', 'signee'),
    supabase.from('interventions')
      .select('id, titre, urgence, statut, cree_le, clients(nom_entreprise)')
      .order('cree_le', { ascending: false }).limit(5),
  ])
  // Throw on the first error so React Query surfaces it
  for (const r of results) {
    if (r.error) throw r.error
  }
  const [r0, r1, r2, r3, r4, r5, r6, r7, r8, r9, r10, r11, r12] = results
  const totalEquipment = r5.count ?? 0
  const brokenEquipment = r6.count ?? 0
  const maintenanceEquipment = r7.count ?? 0
  return {
    totalCompanies:        r0.count ?? 0,
    totalTechnicians:      r1.count ?? 0,
    pendingValidation:     r2.count ?? 0,
    activeInterventions:   r3.count ?? 0,
    criticalInterventions: r4.count ?? 0,
    totalEquipment,
    brokenEquipment,
    maintenanceEquipment,
    operationalEquipment:  Math.max(0, totalEquipment - brokenEquipment - maintenanceEquipment),
    intPlanifiee:          r8.count ?? 0,
    intEnCours:            r9.count ?? 0,
    intTerminee:           r10.count ?? 0,
    intSignee:             r11.count ?? 0,
    recentInterventions:   r12.data ?? [],
  }
}

// ----- UI -----

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

function StatCard({ icon: Icon, label, value, sub, alert }: {
  icon: any; label: string; value: number; sub?: string; alert?: boolean
}) {
  return (
    <div className={`bg-card border rounded-lg p-4 flex items-center gap-3 ${alert && value > 0 ? 'border-amber-300 dark:border-amber-700' : 'border-border'}`}>
      <div className={`w-9 h-9 rounded-md flex items-center justify-center flex-shrink-0 ${alert && value > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-primary/8'}`}>
        <Icon size={17} className={alert && value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-primary'} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-foreground leading-none">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{sub}</p>}
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

// ----- Page -----

export function AdminDashboardPage() {
  const { profile } = useAuthStore()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats'],
    queryFn: fetchAdminStats,
    refetchInterval: 60_000,
  })

  if (isLoading) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-12 bg-muted rounded-lg w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
        Erreur de chargement : {(error as Error)?.message ?? 'Données indisponibles'}
      </div>
    )
  }

  const s = stats

  return (
    <div className="space-y-5 page-transition max-w-5xl">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs text-muted-foreground">{getGreeting()}</p>
          <h1 className="text-xl font-bold text-foreground">{profile?.nom} {profile?.prenom}</h1>
        </div>
        {s.pendingValidation > 0 && (
          <Link
            to="/admin/utilisateurs"
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <Clock size={13} />
            {s.pendingValidation} compte{s.pendingValidation > 1 ? 's' : ''} en attente
          </Link>
        )}
      </div>

      {/* Stats KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Users}         label="Entreprises"       value={s.totalCompanies} />
        <StatCard icon={Wrench}        label="Techniciens"       value={s.totalTechnicians} />
        <StatCard icon={Monitor}       label="Équipements"       value={s.totalEquipment} />
        <StatCard icon={FileText}      label="Interventions actives" value={s.activeInterventions} />
        <StatCard icon={Monitor}       label="En panne"          value={s.brokenEquipment} alert={s.brokenEquipment > 0} />
        <StatCard icon={AlertTriangle} label="Critiques actives" value={s.criticalInterventions} alert />
        <StatCard icon={Clock}         label="En attente valid." value={s.pendingValidation} alert />
      </div>
      {/* Graphes vraies données */}
      <div className="grid gap-4 md:grid-cols-2">
        <DonutChart
          title="Parc équipements par état"
          centerLabel="Équip."
          data={[
            { label: 'Opérationnels', value: s.operationalEquipment, color: '#10b981' },
            { label: 'Maintenance', value: s.maintenanceEquipment, color: '#f59e0b' },
            { label: 'En panne', value: s.brokenEquipment, color: '#ef4444' },
          ]}
        />
        <BarChart
          title="Interventions par statut"
          data={[
            { label: 'Planif.', value: s.intPlanifiee, color: '#3b82f6' },
            { label: 'En cours', value: s.intEnCours, color: '#f59e0b' },
            { label: 'À signer', value: s.intTerminee, color: '#a855f7' },
            { label: 'Clôturées', value: s.intSignee, color: '#10b981' },
          ]}
        />
      </div>

      {/* Accès rapide */}
      <div className="bg-card border border-border rounded-lg p-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Accès rapide</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { to: '/admin/utilisateurs',  label: 'Utilisateurs',  icon: Users },
            { to: '/admin/interventions', label: 'Interventions', icon: Wrench },
            { to: '/admin/equipements',   label: 'Équipements',   icon: Monitor },
            { to: '/admin/contrats',      label: 'Contrats',      icon: FileText },
          ].map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-2.5 px-3 py-2.5 border border-border rounded-md hover:bg-accent hover:border-primary/30 transition-all group"
            >
              <Icon size={15} className="text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium text-foreground">{label}</span>
              <ArrowRight size={13} className="ml-auto text-muted-foreground/40 group-hover:text-muted-foreground" />
            </Link>
          ))}
        </div>
      </div>

      {/* Interventions récentes */}
      {s.recentInterventions.length > 0 && (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground">Interventions récentes</p>
            <Link to="/admin/interventions"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Voir tout <ArrowRight size={11} />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {s.recentInterventions.map((inv: any) => (
              <Link
                key={inv.id}
                to={`/admin/interventions/${inv.id}`}
                className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${URGENCY_DOT[inv.urgence] ?? 'bg-muted-foreground'}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{inv.titre}</p>
                  <p className="text-xs text-muted-foreground">{inv.clients?.nom_entreprise ?? '—'}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_CLASS[inv.statut] ?? ''}`}>
                  {STATUS_LABEL[inv.statut] ?? inv.statut}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
