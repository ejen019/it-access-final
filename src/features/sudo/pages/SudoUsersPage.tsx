// =============================================================
// SudoUsersPage — Gestion complète des utilisateurs (Super Admin)
// =============================================================
import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Trash2,
  Search, Building2, Wrench, Clock, Shield, RefreshCw,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditAction } from '@/lib/audit'

type Tab = 'pending' | 'companies' | 'technicians' | 'admins'

// ----- Fetch helpers -----

async function fetchUsers(tab: Tab) {
  if (tab === 'pending') {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, role, compte_valide, est_actif, cree_le')
      .eq('compte_valide', false)
      .in('role', ['client', 'technicien'])
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  if (tab === 'companies') {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, compte_valide, est_actif, cree_le, clients(id, nom_entreprise, ville, secteur)')
      .eq('role', 'client')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  if (tab === 'technicians') {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, compte_valide, est_actif, cree_le, techniciens(id, specialite)')
      .eq('role', 'technicien')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data ?? []
  }

  // admins
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, prenom, email, compte_valide, est_actif, cree_le')
    .eq('role', 'admin')
    .order('cree_le', { ascending: false })
  if (error) throw error
  return data ?? []
}


async function validateUser(userId: string) {
  const { error } = await supabase
    .from('utilisateurs')
    .update({ compte_valide: true, est_actif: true })
    .eq('id', userId)
  if (error) throw error
  await supabase.from('notifications').insert({
    utilisateur_id: userId,
    type: 'account_validated',
    titre: 'Compte validé',
    corps: "Votre compte a été validé. Vous pouvez maintenant accéder à l'application.",
    lien: '/',
  })
}

async function toggleActive(userId: string, current: boolean) {
  const { error } = await supabase
    .from('utilisateurs')
    .update({ est_actif: !current })
    .eq('id', userId)
  if (error) throw error
}

async function deleteUser(userId: string) {
  await logAuditAction({
    action: 'users.delete_requested',
    entityType: 'utilisateurs',
    entityId: userId,
    details: { source: 'sudo_panel' },
  })
  const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

// ----- UI -----

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }) {
  const cls = {
    success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {label}
    </span>
  )
}

// ----- Page -----

export function SudoUsersPage() {
  const location = useLocation()
  const defaultTab = (location.state as { defaultTab?: Tab } | null)?.defaultTab
  const { profile: me } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>(
    defaultTab === 'companies' || defaultTab === 'technicians' || defaultTab === 'admins'
      ? defaultTab
      : 'pending'
  )
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: users = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sudo-users', tab],
    queryFn: () => fetchUsers(tab),
  })

  const { mutate: doValidate } = useMutation({
    mutationFn: validateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-users'] }),
  })
  const { mutate: doToggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sudo-users'] }),
  })
  const { mutate: doDelete } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sudo-users'] })
      queryClient.invalidateQueries({ queryKey: ['sudo-stats'] })
      setDeleteConfirm(null)
    },
  })

  const filtered = users.filter((u: any) => {
    const name = (u.clients?.nom_entreprise ?? `${u.prenom ?? ''} ${u.nom}`).toLowerCase()
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  })

  const TABS: { id: Tab; label: string; icon: any }[] = [
    { id: 'pending',     label: 'En attente',  icon: Clock },
    { id: 'companies',   label: 'Entreprises', icon: Building2 },
    { id: 'technicians', label: 'Techniciens', icon: Wrench },
    { id: 'admins',      label: 'Admins',      icon: Shield },
  ]

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Tous les comptes de la plateforme</p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-full sm:w-fit overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => { setTab(id); setSearch('') }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${
              tab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive">
          Erreur : {(error as Error).message}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? 'Aucun compte en attente de validation' : 'Aucun résultat'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Nom / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    {tab === 'companies' ? 'Entreprise' : tab === 'technicians' ? 'Spécialité' : 'Téléphone'}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Inscrit le</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{`${user.prenom ?? ''} ${user.nom}`.trim()}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {tab === 'companies'
                          ? (user.clients?.nom_entreprise ?? '—')
                          : tab === 'technicians'
                          ? (user.techniciens?.specialite ?? '—')
                          : '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {!user.compte_valide
                        ? <Badge label="En attente" variant="warning" />
                        : user.est_actif
                        ? <Badge label="Actif" variant="success" />
                        : <Badge label="Désactivé" variant="danger" />}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">
                        {new Date(user.cree_le).toLocaleDateString('fr-FR')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {!user.compte_valide && (
                          <button onClick={() => doValidate(user.id)} title="Valider"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        {user.role !== 'super_admin' && (
                          <button
                            onClick={() => doToggle({ id: user.id, active: user.est_actif })}
                            title={user.est_actif ? 'Désactiver' : 'Réactiver'}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                            <XCircle size={16} />
                          </button>
                        )}
                        {user.id !== me?.id && (
                          <button onClick={() => setDeleteConfirm(user.id)} title="Supprimer"
                            className="p-1.5 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {deleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setDeleteConfirm(null)}
        >
          <div className="bg-card border border-border rounded-xl p-6 w-full max-w-sm space-y-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-foreground">Supprimer cet utilisateur ?</h3>
            <p className="text-sm text-muted-foreground">Action irréversible. Toutes les données associées seront supprimées.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-sm text-muted-foreground hover:bg-accent transition-colors">
                Annuler
              </button>
              <button onClick={() => doDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm font-medium transition-colors">
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
