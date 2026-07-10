// =============================================================
// EntrepriseDashboardPage — Tableau de bord entreprise
// Style unifié : flat, compact, propre (même que SudoDashboard).
// =============================================================
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Monitor, AlertTriangle, Wrench, PenLine, ArrowRight, Copy, CheckCircle2, Building2, RefreshCw, X } from 'lucide-react'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useClientEquipement } from '@/features/equipment/hooks/useEquipment'
import { useInterventionsClient } from '@/features/interventions/hooks/useInterventions'
import { DonutChart } from '@/components/shared/DonutChart'
import { BarChart } from '@/components/shared/BarChart'

async function fetchMyCompany(userId: string) {
  const { data } = await supabase
    .from('clients')
    .select('id, nom_entreprise, code_signature')
    .eq('utilisateur_id', userId)
    .single()
  return data
}

async function fetchContrat(clientId: string) {
  const { data } = await supabase
    .from('contrats')
    .select('*, abonnements(*)')
    .eq('client_id', clientId)
    .order('cree_le', { ascending: false })
    .limit(1)
    .maybeSingle()
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


export function EntrepriseDashboardPage() {
  const { profile, reset } = useAuthStore()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [codeCopied, setCodeCopied] = useState(false)
  const [showResilier, setShowResilier] = useState(false)
  const [contratBusy, setContratBusy] = useState(false)

  const { data: client } = useQuery({
    queryKey: ['my-company', profile?.id],
    queryFn: () => fetchMyCompany(profile!.id),
    enabled: !!profile,
  })
  const { data: contrat } = useQuery({
    queryKey: ['my-contrat', client?.id],
    queryFn: () => fetchContrat(client!.id),
    enabled: !!client?.id,
  })

  // Statut du contrat (expiration / résiliation)
  const contratFin = contrat?.date_fin ? new Date(contrat.date_fin) : null
  const joursRestants = contratFin ? Math.ceil((contratFin.getTime() - Date.now()) / 86400000) : null
  const contratExpire = contrat ? (!contrat.est_actif || (joursRestants != null && joursRestants < 0)) : false
  const contratBientot = contrat != null && contrat.est_actif && joursRestants != null && joursRestants >= 0 && joursRestants <= 30

  async function renouvelerContrat() {
    if (!contrat) return
    setContratBusy(true)
    try {
      const fin = new Date(); fin.setFullYear(fin.getFullYear() + 1)
      await supabase.from('contrats')
        .update({ date_fin: fin.toISOString().slice(0, 10), est_actif: true, raison: null })
        .eq('id', contrat.id)
      queryClient.invalidateQueries({ queryKey: ['my-contrat', client?.id] })
    } finally { setContratBusy(false) }
  }

  async function resilierContrat() {
    if (!contrat || !profile) return
    setContratBusy(true)
    try {
      await supabase.from('contrats').update({ est_actif: false, raison: 'Résilié par le client' }).eq('id', contrat.id)
      await supabase.from('utilisateurs').update({ est_actif: false }).eq('id', profile.id)
      await supabase.auth.signOut()
      reset()
      navigate('/connexion')
    } finally { setContratBusy(false) }
  }
  const { data: equipment = [] } = useClientEquipement(client?.id)
  const { data: interventions = [] } = useInterventionsClient(client?.id)

  const pannes       = equipment.filter((e: any) => e.etat === 'en_panne').length
  const maintenance  = equipment.filter((e: any) => e.etat === 'maintenance').length
  const operationnel = Math.max(0, equipment.length - pannes - maintenance)
  const toSign       = interventions.filter((i: any) => i.statut === 'terminee').length
  const activeInterv = interventions.filter((i: any) => ['planifiee', 'en_cours'].includes(i.statut)).length
  const planifiees   = interventions.filter((i: any) => i.statut === 'planifiee').length
  const enCours      = interventions.filter((i: any) => i.statut === 'en_cours').length
  const cloturees    = interventions.filter((i: any) => i.statut === 'signee').length

  async function copyCode() {
    if (!client?.code_signature) return
    await navigator.clipboard.writeText(client.code_signature)
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
          <p className="text-xs text-muted-foreground">{getGreeting()}, {profile?.nom}</p>
          <h1 className="text-lg font-bold text-foreground leading-tight">{client?.nom_entreprise ?? 'Mon Espace'}</h1>
        </div>
      </div>

      {/* Contrat : expiration / renouvellement */}
      {contratExpire && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {contrat && !contrat.est_actif && (joursRestants == null || joursRestants >= 0) ? 'Contrat résilié / inactif' : 'Contrat expiré'}
            </p>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">Renouvelez votre contrat pour continuer à bénéficier du service.</p>
          <button onClick={renouvelerContrat} disabled={contratBusy}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium disabled:opacity-60">
            <RefreshCw size={14} className={contratBusy ? 'animate-spin' : ''} /> Renouveler (1 an)
          </button>
        </div>
      )}
      {contratBientot && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
              Votre contrat expire dans {joursRestants} jour{(joursRestants ?? 0) > 1 ? 's' : ''}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">Le {contratFin?.toLocaleDateString('fr-FR')}</p>
          </div>
          <button onClick={renouvelerContrat} disabled={contratBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium disabled:opacity-60">
            <RefreshCw size={13} className={contratBusy ? 'animate-spin' : ''} /> Renouveler
          </button>
        </div>
      )}

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
      <Link to="/entreprise/interventions"
        className="flex items-center justify-center gap-1.5 text-xs text-primary hover:underline">
        Voir toutes mes interventions <ArrowRight size={11} />
      </Link>
      <div className="grid gap-3 md:grid-cols-2">
        <DonutChart
          title="Mon parc par état"
          centerLabel="Équip."
          data={[
            { label: 'Opérationnels', value: operationnel, color: '#10b981' },
            { label: 'Maintenance', value: maintenance, color: '#f59e0b' },
            { label: 'En panne', value: pannes, color: '#ef4444' },
          ]}
        />
        <BarChart
          title="Mes interventions par statut"
          data={[
            { label: 'Planif.', value: planifiees, color: '#3b82f6' },
            { label: 'En cours', value: enCours, color: '#f59e0b' },
            { label: 'À signer', value: toSign, color: '#a855f7' },
            { label: 'Clôturées', value: cloturees, color: '#10b981' },
          ]}
        />
      </div>

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
      {client?.code_signature && (
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
              {client.code_signature}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Donnez ce code au technicien pour valider une intervention
            </p>
          </div>
        </div>
      )}

      {/* Contrat */}
      {contrat && (
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-foreground">Contrat {contrat.abonnements?.plan}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              contrat.est_actif ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'
            }`}>
              {contrat.est_actif ? 'Actif' : 'Expiré'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Expire le {new Date(contrat.date_fin).toLocaleDateString('fr-FR')}
          </p>
          {contrat.abonnements?.max_equipements && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Équipements</span>
                <span>{equipment.length} / {contrat.abonnements.max_equipements}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${Math.min(100, (equipment.length / contrat.abonnements.max_equipements) * 100)}%` }}
                />
              </div>
            </div>
          )}
          {contrat.est_actif && (
            <button onClick={() => setShowResilier(true)}
              className="mt-3 text-xs text-destructive hover:underline">
              Résilier mon contrat
            </button>
          )}
        </div>
      )}

      {/* Modal résiliation */}
      {showResilier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => !contratBusy && setShowResilier(false)}>
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-destructive" />
              <h3 className="font-semibold text-foreground">Résilier le contrat ?</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Votre contrat sera résilié et votre compte <strong>désactivé</strong>. Vous ne pourrez plus vous connecter ni accéder à vos données (un administrateur pourra réactiver votre compte plus tard). Votre compte n'est pas supprimé.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowResilier(false)} disabled={contratBusy}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button onClick={resilierContrat} disabled={contratBusy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium disabled:opacity-60 transition-colors">
                {contratBusy ? <RefreshCw size={14} className="animate-spin" /> : <X size={14} />} Résilier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
