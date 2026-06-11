// =============================================================
// SudoEquipmentPage — Vue globale des équipements (Super Admin)
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, Monitor, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

// ----- Fetch -----

async function fetchAllEquipements() {
  const { data, error } = await supabase
    .from('equipements')
    .select('id, nom, modele, numero_serie, etat, categorie, emplacement, cree_le, clients(id, nom_entreprise)')
    .order('cree_le', { ascending: false })
  if (error) throw error
  return data ?? []
}

async function fetchClients() {
  const { data } = await supabase
    .from('clients')
    .select('id, nom_entreprise')
    .order('nom_entreprise')
  return data ?? []
}

// ----- Page -----

export function SudoEquipmentPage() {
  const [search, setSearch] = useState('')
  const [filterClient, setFilterClient] = useState('')
  const [filterEtat, setFilterEtat] = useState('')

  const { data: equipements = [], isLoading, error, refetch } = useQuery({
    queryKey: ['sudo-equipements'],
    queryFn: fetchAllEquipements,
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['sudo-clients-list'],
    queryFn: fetchClients,
  })

  const filtered = equipements.filter((e: any) => {
    const matchSearch = (e.nom ?? '').toLowerCase().includes(search.toLowerCase())
      || (e.numero_serie ?? '').toLowerCase().includes(search.toLowerCase())
      || (e.modele ?? '').toLowerCase().includes(search.toLowerCase())
    const matchClient = !filterClient || e.clients?.id === filterClient
    const matchEtat = !filterEtat || e.etat === filterEtat
    return matchSearch && matchClient && matchEtat
  })

  const stats = {
    total: equipements.length,
    operationnel: equipements.filter((e: any) => e.etat === 'operationnel').length,
    en_panne: equipements.filter((e: any) => e.etat === 'en_panne').length,
  }

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Équipements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {stats.total} équipement{stats.total > 1 ? 's' : ''}
            {stats.en_panne > 0 && <span className="text-red-500 ml-2">· {stats.en_panne} en panne</span>}
          </p>
        </div>
        <button onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm text-muted-foreground hover:bg-accent transition-colors">
          <RefreshCw size={14} />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total', value: stats.total },
          { label: 'Opérationnels', value: stats.operationnel },
          { label: 'En panne', value: stats.en_panne, alert: stats.en_panne > 0 },
        ].map(({ label, value, alert }) => (
          <div key={label}
            className={`bg-card border rounded-lg p-4 ${alert ? 'border-red-300 dark:border-red-700' : 'border-border'}`}>
            <p className={`text-2xl font-bold ${alert ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full sm:flex-1 sm:min-w-[16rem]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Nom, modèle, n° série…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <select
          value={filterClient}
          onChange={(e) => setFilterClient(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Toutes les entreprises</option>
          {(clients as any[]).map((c) => (
            <option key={c.id} value={c.id}>{c.nom_entreprise}</option>
          ))}
        </select>
        <select
          value={filterEtat}
          onChange={(e) => setFilterEtat(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Tous les états</option>
          <option value="operationnel">Opérationnel</option>
          <option value="maintenance">Maintenance</option>
          <option value="en_panne">En panne</option>
        </select>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 text-sm text-destructive flex items-center gap-2">
          <AlertTriangle size={16} />
          {(error as Error).message}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Monitor size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Aucun équipement trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">Équipement</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Entreprise</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">État</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Catégorie</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wide">Passeport</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((eq: any) => (
                  <tr key={eq.id} className="border-b border-border last:border-0 hover:bg-accent/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{eq.nom}</p>
                      {eq.modele && <p className="text-xs text-muted-foreground">{eq.modele}</p>}
                      {eq.numero_serie && (
                        <p className="text-xs text-muted-foreground/70">S/N: {eq.numero_serie}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-xs text-muted-foreground">{eq.clients?.nom_entreprise ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        eq.etat === 'operationnel'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : eq.etat === 'maintenance'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {eq.etat === 'operationnel' ? 'Opérationnel' : eq.etat === 'maintenance' ? 'Maintenance' : 'En panne'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <p className="text-xs text-muted-foreground">{eq.categorie ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/sudo/equipements/${eq.id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/8 text-primary hover:bg-primary/15 transition-colors"
                      >
                        <ExternalLink size={12} />
                        Voir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
