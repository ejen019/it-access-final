// =============================================================
// useEquipment — Hook partagé pour toutes les opérations CRUD équipements
// Utilisé par EquipmentAdminPage, ParcPage, EquipmentPassportPage
// =============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import { getPassportUrl } from '@/lib/utils/qrcode'
import type { Equipment } from '@/types'

// ----- Lecture -----

export function useCompanyEquipment(companyId: string | undefined) {
  return useQuery({
    queryKey: ['equipment', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data ?? []) as Equipment[]
    },
    enabled: !!companyId,
  })
}

export function useEquipmentDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['equipment-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('equipment')
        .select(`
          *,
          companies ( company_name ),
          equipment_documents ( * )
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

export function useAllEquipment() {
  return useQuery({
    queryKey: ['equipment-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('*, companies ( company_name )')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

// ----- Mutations -----

export type EquipmentInput = {
  company_id: string
  name: string
  model?: string
  serial_number?: string
  category?: string
  location?: string
  purchase_date?: string
  warranty_end?: string
  notes?: string
  photos?: string[]
  created_by: string
}

export function useCreateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: EquipmentInput) => {
      // Crée d'abord avec un QR code temporaire basé sur l'UUID généré
      const { data, error } = await supabase
        .from('equipment')
        .insert({
          ...input,
          status: 'operationnel',
          photos: input.photos ?? [],
          // QR code sera mis à jour après insertion pour avoir l'ID réel
          qr_code: 'pending',
        })
        .select()
        .single()

      if (error || !data) throw error

      // Met à jour le QR code avec l'URL contenant l'ID réel
      const qrCode = getPassportUrl(data.id)
      await supabase.from('equipment').update({ qr_code: qrCode }).eq('id', data.id)

      return { ...data, qr_code: qrCode }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', data.company_id] })
      queryClient.invalidateQueries({ queryKey: ['equipment-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useUpdateEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Equipment> }) => {
      const { data, error } = await supabase
        .from('equipment')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', data.company_id] })
      queryClient.invalidateQueries({ queryKey: ['equipment-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['equipment-all'] })
    },
  })
}

export function useDeleteEquipment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, companyId }: { id: string; companyId: string }) => {
      const { error } = await supabase.from('equipment').delete().eq('id', id)
      if (error) throw error
      return { id, companyId }
    },
    onSuccess: ({ companyId }) => {
      queryClient.invalidateQueries({ queryKey: ['equipment', companyId] })
      queryClient.invalidateQueries({ queryKey: ['equipment-all'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

// Upload photo vers Supabase Storage et retourne l'URL publique
export async function uploadEquipmentPhoto(file: File, equipmentId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `equipment/${equipmentId}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('it-access-file')
    .upload(path, file, { upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('it-access-file').getPublicUrl(path)
  return data.publicUrl
}
