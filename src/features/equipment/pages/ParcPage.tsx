// =============================================================
// ParcPage — Vue parc d'équipements pour l'Entreprise
//
// Liste tous les équipements de l'entreprise connectée.
// Actions : Ajouter, Voir passeport, Signaler panne
// =============================================================
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Monitor, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth.store'
import { useCompanyEquipment } from '../hooks/useEquipment'
import { EquipmentForm } from '../components/EquipmentForm'
import type { Equipment } from '@/types'

// Récupère l'ID de l'entreprise liée au profil connecté
async function fetchMyCompanyId(userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('companies')
    .select('id')
    .eq('user_id', userId)
    .single()
  return data?.id ?? null
}

function EquipmentCard({ equipment }: { equipment: Equipment }) {
  return (
    <Link
      to={`/entreprise/parc/${equipment.id}`}
      className="bg-card border border-border rounded-xl p-4 hover:shadow-md hover:border-primary/40 transition-all group"
    >
      {/* Photo ou icône par défaut */}
      <div className="w-full h-32 bg-muted rounded-lg mb-3 overflow-hidden flex items-center justify-center">
        {equipment.photos[0] ? (
          <img src={equipment.photos[0]} alt={equipment.name} className="w-full h-full object-cover" />
        ) : (
          <Monitor size={32} className="text-muted-foreground/40" />
        )}
      </div>

      {/* Statut */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          equipment.status === 'operationnel' ? 'status-operationnel' : 'status-en-panne'
        }`}>
          {equipment.status === 'operationnel' ? 'Opérationnel' : 'En panne'}
        </span>
        {equipment.category && (
          <span className="text-xs text-muted-foreground">{equipment.category}</span>
        )}
      </div>

      <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
        {equipment.name}
      </p>
      {equipment.model && (
        <p className="text-xs text-muted-foreground mt-0.5">{equipment.model}</p>
      )}
      {equipment.location && (
        <p className="text-xs text-muted-foreground mt-1">📍 {equipment.location}</p>
      )}
    </Link>
  )
}

export function ParcPage() {
  const { profile } = useAuthStore()
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'operationnel' | 'en_panne'>('all')

  const { data: companyId } = useQuery({
    queryKey: ['my-company-id', profile?.id],
    queryFn: () => fetchMyCompanyId(profile!.id),
    enabled: !!profile,
  })

  const { data: equipment = [], isLoading } = useCompanyEquipment(companyId ?? undefined)

  const filtered = equipment.filter((e) => {
    const matchSearch = e.name.toLowerCase().includes(search.toLowerCase())
      || (e.model ?? '').toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || e.status === filterStatus
    return matchSearch && matchStatus
  })

  const panneCount = equipment.filter((e) => e.status === 'en_panne').length

  if (isLoading) {
    return (
      <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 page-transition">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Mon Parc</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {equipment.length} équipement{equipment.length > 1 ? 's' : ''}
            {panneCount > 0 && ` · ${panneCount} en panne`}
          </p>
        </div>
        {companyId && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium"
          >
            <Plus size={16} />
            Ajouter
          </button>
        )}
      </div>

      {/* Filtres */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-4 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(['all', 'operationnel', 'en_panne'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === s
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-accent'
              }`}
            >
              {s === 'all' ? 'Tous' : s === 'operationnel' ? 'Opérationnels' : 'En panne'}
            </button>
          ))}
        </div>
      </div>

      {/* Grille équipements */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <Monitor size={40} className="mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            {equipment.length === 0 ? 'Aucun équipement enregistré' : 'Aucun résultat'}
          </p>
          {equipment.length === 0 && companyId && (
            <button
              onClick={() => setShowForm(true)}
              className="text-sm text-primary hover:underline"
            >
              Ajouter le premier équipement
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((e) => (
            <EquipmentCard key={e.id} equipment={e} />
          ))}
        </div>
      )}

      {/* Modal ajout équipement */}
      {showForm && companyId && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40">
          <div className="bg-card border border-border rounded-t-2xl sm:rounded-xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-5 pt-5 pb-3 border-b border-border">
              <h2 className="font-semibold text-foreground">Nouvel équipement</h2>
            </div>
            <div className="p-5">
              <EquipmentForm
                companyId={companyId}
                onSuccess={() => {
                  setShowForm(false)
                  queryClient.invalidateQueries({ queryKey: ['equipment', companyId] })
                }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
