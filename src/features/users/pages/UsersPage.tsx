// =============================================================
// UsersPage — Gestion des utilisateurs (Admin)
// =============================================================
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CheckCircle2, XCircle, Trash2,
  Search, Building2, Wrench, Clock,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { logAuditAction } from '@/lib/audit'

type Tab = 'pending' | 'companies' | 'technicians'

async function fetchUtilisateurs(tab: Tab) {
  if (tab === 'pending') {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, telephone, role, compte_valide, est_actif, cree_le, clients(id, nom_entreprise), techniciens(id, specialite)')
      .eq('compte_valide', false)
      .in('role', ['client', 'technicien'])
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  if (tab === 'companies') {
    const { data, error } = await supabase
      .from('utilisateurs')
      .select('id, nom, prenom, email, telephone, compte_valide, est_actif, cree_le, clients(id, nom_entreprise, ville, secteur)')
      .eq('role', 'client')
      .order('cree_le', { ascending: false })
    if (error) throw error
    return data ?? []
  }
  const { data, error } = await supabase
    .from('utilisateurs')
    .select('id, nom, prenom, email, telephone, compte_valide, est_actif, cree_le, techniciens(id, specialite)')
    .eq('role', 'technicien')
    .order('cree_le', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function validateUser(userId: string) {
  await supabase.from('utilisateurs').update({ compte_valide: true, est_actif: true }).eq('id', userId)
  await supabase.from('notifications').insert({
    utilisateur_id: userId,
    type: 'account_validated',
    titre: 'Compte validé',
    corps: "Votre compte a été validé. Vous pouvez maintenant accéder à l'application.",
    lien: '/',
  })
}

async function toggleActive(userId: string, isActive: boolean) {
  await supabase.from('utilisateurs').update({ est_actif: !isActive }).eq('id', userId)
}

async function deleteUser(userId: string) {
  await logAuditAction({
    action: 'users.delete_requested',
    entityType: 'utilisateurs',
    entityId: userId,
    details: { source: 'admin_panel' },
  })
  const { data, error } = await supabase.functions.invoke('delete-user', { body: { userId } })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

function Badge({ label, variant }: { label: string; variant: 'success' | 'warning' | 'danger' }) {
  const cls = {
    success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    danger:  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cls[variant]}`}>
      {label}
    </span>
  )
}

export function UsersPage() {
  const { profile: me } = useAuthStore()
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<Tab>('pending')
  const [search, setSearch] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', tab],
    queryFn: () => fetchUtilisateurs(tab),
  })

  const { mutate: doValidate } = useMutation({
    mutationFn: validateUser,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const { mutate: doToggle } = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => toggleActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['users'] }),
  })
  const { mutate: doDelete } = useMutation({
    mutationFn: deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      setDeleteConfirm(null)
    },
  })

  const filtered = users.filter((u: any) => {
    const name = (u.clients?.nom_entreprise ?? `${u.prenom ?? ''} ${u.nom}`).toLowerCase()
    return name.includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  })

  const TABS = [
    { id: 'pending' as Tab, label: 'En attente', icon: Clock },
    { id: 'companies' as Tab, label: 'Entreprises', icon: Building2 },
    { id: 'technicians' as Tab, label: 'Techniciens', icon: Wrench },
  ]

  return (
    <div className="space-y-6 page-transition">
      <h1 className="text-2xl font-bold text-foreground">Utilisateurs</h1>

      <div className="flex gap-1 bg-muted p-1 rounded-lg w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
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
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 text-sm text-destructive">
          Erreur de chargement : {(error as Error).message}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {tab === 'pending' ? 'Aucun compte en attente' : 'Aucun résultat'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Nom / Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden md:table-cell">Téléphone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Statut</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase hidden lg:table-cell">Depuis</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user: any) => (
                  <tr key={user.id} className="border-b border-border hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {user.clients?.nom_entreprise ?? `${user.prenom ?? ''} ${user.nom}`.trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      {tab === 'technicians' && user.techniciens?.specialite && (
                        <p className="text-xs text-primary mt-0.5">{user.techniciens.specialite}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{user.telephone ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      {!user.compte_valide
                        ? <Badge label="En attente" variant="warning" />
                        : user.est_actif
                          ? <Badge label="Actif" variant="success" />
                          : <Badge label="Désactivé" variant="danger" />
                      }
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
                            className="p-1.5 rounded-lg text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
                            <CheckCircle2 size={16} />
                          </button>
                        )}
                        <button onClick={() => doToggle({ id: user.id, active: user.est_actif })} title={user.est_actif ? 'Désactiver' : 'Réactiver'}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors">
                          <XCircle size={16} />
                        </button>
                        {(me?.role === 'super_admin' || user.role !== 'super_admin') && (
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
            <p className="text-sm text-muted-foreground">Action irréversible. Toutes les données associées seront perdues.</p>
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
