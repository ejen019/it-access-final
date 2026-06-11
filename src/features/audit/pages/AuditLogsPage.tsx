import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, History } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function AuditLogsPage() {
  const [search, setSearch] = useState('')

  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['journaux-audit'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('journaux_audit')
        .select('id, acteur_id, role_acteur, action, type_entite, entite_id, details, cree_le, utilisateurs(nom, prenom, email)')
        .order('cree_le', { ascending: false })
        .limit(500)
      if (error) throw error
      return data ?? []
    },
  })

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return logs
    return logs.filter((log: any) => {
      const actor = `${log.utilisateurs?.prenom ?? ''} ${log.utilisateurs?.nom ?? ''} ${log.utilisateurs?.email ?? ''}`.toLowerCase()
      const line = `${log.action} ${log.type_entite} ${log.entite_id ?? ''} ${log.role_acteur ?? ''}`.toLowerCase()
      return actor.includes(q) || line.includes(q)
    })
  }, [logs, search])

  return (
    <div className="space-y-6 page-transition">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg gradient-primary flex items-center justify-center">
          <History size={18} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Historique global</h1>
          <p className="text-sm text-muted-foreground">Traçabilité de toutes les actions métier</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrer par action, entité, utilisateur…"
          className="w-full pl-9 pr-4 py-2.5 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {isLoading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Chargement…</p>
        ) : error ? (
          <p className="p-8 text-center text-sm text-destructive">Erreur: {(error as Error).message}</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">Aucun évènement</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px]">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Quand</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Qui</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Entité</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Détails</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log: any) => (
                  <tr key={log.id} className="border-b border-border align-top hover:bg-accent/30">
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.cree_le)}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-foreground">
                        {log.utilisateurs ? `${log.utilisateurs.prenom ?? ''} ${log.utilisateurs.nom}`.trim() : 'Utilisateur supprimé'}
                      </p>
                      <p className="text-xs text-muted-foreground">{log.utilisateurs?.email ?? log.acteur_id}</p>
                      <p className="text-[11px] text-muted-foreground uppercase mt-0.5">{log.role_acteur ?? 'inconnu'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">{log.action}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <p>{log.type_entite}</p>
                      {log.entite_id && <p className="text-xs">{log.entite_id}</p>}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground max-w-[360px]">
                      <pre className="whitespace-pre-wrap break-words font-mono text-[11px]">
                        {JSON.stringify(log.details ?? {}, null, 2)}
                      </pre>
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
