import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { getPassportUrl } from '@/lib/utils/qrcode'
import type { Equipement } from '@/types'

export function useClientEquipement(clientId: string | undefined) {
  return useQuery({
    queryKey: ['equipements', clientId],
    queryFn: async () => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('equipements')
        .select('*')
        .eq('client_id', clientId)
        .order('cree_le', { ascending: false })
      if (error) throw error
      return (data ?? []) as Equipement[]
    },
    enabled: !!clientId,
  })
}

export function useEquipementDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['equipement-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('equipements')
        .select('*, clients(nom_entreprise), documents_equipement(*)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useTousEquipements() {
  return useQuery({
    queryKey: ['equipements-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipements')
        .select('*, clients(nom_entreprise)')
        .order('cree_le', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export type EquipementInput = {
  client_id: string
  nom: string
  modele?: string
  numero_serie?: string
  categorie?: string
  emplacement?: string
  date_achat?: string
  fin_garantie?: string
  notes?: string
  photos?: string[]
  cree_par: string
}

export function useCreerEquipement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EquipementInput) => {
      const { data, error } = await supabase
        .from('equipements')
        .insert({
          ...input,
          etat: 'operationnel',
          photos: input.photos ?? [],
          qr_code: 'pending',
        })
        .select()
        .single()
      if (error || !data) throw error

      const qrCode = getPassportUrl(data.id)
      await supabase.from('equipements').update({ qr_code: qrCode }).eq('id', data.id)
      return { ...data, qr_code: qrCode }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipements', data.client_id] })
      queryClient.invalidateQueries({ queryKey: ['equipements-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useModifierEquipement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Equipement> }) => {
      const { data, error } = await supabase
        .from('equipements')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipements', data.client_id] })
      queryClient.invalidateQueries({ queryKey: ['equipement-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['equipements-all'] })
    },
  })
}

export function useSupprimerEquipement() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, clientId }: { id: string; clientId: string }) => {
      const { error } = await supabase.from('equipements').delete().eq('id', id)
      if (error) throw error
      return { id, clientId }
    },
    onSuccess: ({ clientId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipements', clientId] })
      queryClient.invalidateQueries({ queryKey: ['equipements-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export async function uploadPhotoEquipement(file: File, equipementId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `equipements/${equipementId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('it-access-fichiers')
    .upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('it-access-fichiers').getPublicUrl(path)
  return data.publicUrl
}
