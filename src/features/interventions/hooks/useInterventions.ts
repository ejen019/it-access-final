// =============================================================
// useInterventions — Hooks CRUD pour les interventions
// Utilisé par Admin, Technicien et Entreprise
// =============================================================
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { InterventionStatus, UrgencyLevel } from '@/types'

export type InterventionInput = {
  company_id: string
  equipment_ids: string[]
  title: string
  description: string
  urgency: UrgencyLevel
  technician_ids: string[]   // profile IDs des techniciens affectés
  created_by: string         // profile ID du créateur
}

// ----- Queries -----

export function useAllInterventions() {
  return useQuery({
    queryKey: ['interventions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select('*, companies(company_name)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useCompanyInterventions(companyId: string | undefined) {
  return useQuery({
    queryKey: ['interventions-company', companyId],
    queryFn: async () => {
      if (!companyId) return []
      const { data, error } = await supabase
        .from('interventions')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!companyId,
  })
}

// profileId = le user_id du technicien connecté (= profiles.id)
export function useTechInterventions(profileId: string | undefined) {
  return useQuery({
    queryKey: ['interventions-tech', profileId],
    queryFn: async () => {
      if (!profileId) return []
      const { data, error } = await supabase
        .from('interventions')
        .select('*, companies(company_name)')
        .contains('technician_ids', [profileId])
        .neq('status', 'annulee')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!profileId,
  })
}

export function useInterventionDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['intervention-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('interventions')
        .select('*, companies(id, user_id, company_name, validation_code, phone, address, city)')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ----- Helpers notifications -----

async function notifyAdmins(payload: {
  type: string
  title: string
  body: string
  link?: string
}) {
  const { data: admins } = await supabase
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'sudo'])
  if (!admins?.length) return
  await supabase.from('notifications').insert(
    admins.map((a: any) => ({
      user_id: a.id,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
    }))
  )
}

async function notifyEntreprise(companyId: string, payload: {
  type: string
  title: string
  body: string
  link?: string
}) {
  const { data: company } = await supabase
    .from('companies')
    .select('user_id')
    .eq('id', companyId)
    .single()
  if (!company?.user_id) return
  await supabase.from('notifications').insert({
    user_id: company.user_id,
    type: payload.type,
    title: payload.title,
    body: payload.body,
    link: payload.link ?? null,
  })
}

async function notifyTechs(techProfileIds: string[], payload: {
  type: string
  title: string
  body: string
  link?: string
}) {
  if (!techProfileIds.length) return
  await supabase.from('notifications').insert(
    techProfileIds.map((uid) => ({
      user_id: uid,
      type: payload.type,
      title: payload.title,
      body: payload.body,
      link: payload.link ?? null,
    }))
  )
}

// ----- Mutations -----

export function useCreateIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InterventionInput) => {
      const { data, error } = await supabase
        .from('interventions')
        .insert({
          company_id: input.company_id,
          equipment_ids: input.equipment_ids,
          title: input.title,
          description: input.description,
          urgency: input.urgency,
          status: 'active',
          technician_ids: input.technician_ids,
          created_by: input.created_by,
          photos: [],
        })
        .select()
        .single()
      if (error || !data) throw error

      // 1) Notifier les techniciens affectés
      await notifyTechs(input.technician_ids, {
        type: 'intervention_assigned',
        title: 'Nouvelle mission assignée',
        body: input.title,
        link: `/technicien/interventions/${data.id}`,
      })

      // 2) Notifier l'entreprise qu'une intervention a été créée
      await notifyEntreprise(input.company_id, {
        type: 'new_intervention',
        title: 'Nouvelle intervention créée',
        body: `Intervention : ${input.title}${input.urgency === 'critique' ? ' (URGENT)' : ''}`,
        link: `/entreprise/interventions/${data.id}`,
      })

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-company', data.company_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useUpdateInterventionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      extra = {},
    }: {
      id: string
      status: InterventionStatus
      extra?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('interventions')
        .update({ status, ...extra })
        .eq('id', id)
        .select('id, company_id, status, title, technician_ids')
        .single()
      if (error) throw error

      // Notifier en fonction du nouveau statut
      if (status === 'en_attente_validation') {
        // Le tech a clôturé — l'entreprise doit signer
        await notifyEntreprise((data as any).company_id, {
          type: 'intervention_updated',
          title: 'Intervention à signer',
          body: `"${(data as any).title}" attend votre signature pour clôture.`,
          link: `/entreprise/interventions/${(data as any).id}`,
        })
      } else if (status === 'en_cours') {
        // Le tech a démarré — notifier l'entreprise
        await notifyEntreprise((data as any).company_id, {
          type: 'intervention_updated',
          title: 'Intervention démarrée',
          body: `Le technicien a démarré "${(data as any).title}".`,
          link: `/entreprise/interventions/${(data as any).id}`,
        })
      } else if (status === 'annulee') {
        // Admin a annulé — notifier entreprise + techs
        await Promise.all([
          notifyEntreprise((data as any).company_id, {
            type: 'intervention_updated',
            title: 'Intervention annulée',
            body: `"${(data as any).title}" a été annulée.`,
            link: `/entreprise/interventions/${(data as any).id}`,
          }),
          notifyTechs((data as any).technician_ids ?? [], {
            type: 'intervention_updated',
            title: 'Intervention annulée',
            body: `"${(data as any).title}" a été annulée par l'admin.`,
            link: `/technicien/interventions/${(data as any).id}`,
          }),
        ])
      }

      return data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-company', data.company_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useSignIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      signatureDataUrl,
      equipmentIds,
    }: {
      id: string
      signatureDataUrl: string
      equipmentIds: string[]
    }) => {
      // 1. Upload de la signature
      const sigPath = `signatures/${id}/${Date.now()}.png`
      const sigBlob = dataUrlToBlob(signatureDataUrl)
      const { error: uploadErr } = await supabase.storage
        .from('it-access-file')
        .upload(sigPath, sigBlob, { contentType: 'image/png', upsert: false })
      if (uploadErr) throw uploadErr

      const { data: sigUrlData } = supabase.storage
        .from('it-access-file')
        .getPublicUrl(sigPath)

      // 2. Mise à jour de l'intervention
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('interventions')
        .update({
          status: 'cloturee',
          signature_url: sigUrlData.publicUrl,
          signed_at: now,
        })
        .eq('id', id)
        .select('id, company_id, title, technician_ids')
        .single()
      if (error) throw error

      // 3. Remettre les équipements en état opérationnel
      if (equipmentIds.length) {
        await supabase
          .from('equipment')
          .update({ status: 'operationnel' })
          .in('id', equipmentIds)
      }

      // 4. Notifier admins + techs que l'intervention est clôturée
      await Promise.all([
        notifyAdmins({
          type: 'intervention_updated',
          title: 'Intervention clôturée',
          body: `"${(data as any).title}" a été signée et clôturée.`,
          link: `/admin/interventions/${(data as any).id}`,
        }),
        notifyTechs((data as any).technician_ids ?? [], {
          type: 'intervention_updated',
          title: 'Intervention signée',
          body: `"${(data as any).title}" a été signée par le client. Mission terminée.`,
          link: `/technicien/interventions/${(data as any).id}`,
        }),
      ])

      return { ...data, signature_url: sigUrlData.publicUrl }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-company', data.company_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
      // Invalider aussi le parc (équipements redevenus opérationnels)
      queryClient.invalidateQueries({ queryKey: ['equipment'] })
      queryClient.invalidateQueries({ queryKey: ['equipment-all'] })
    },
  })
}

// Upload d'une photo d'intervention vers Supabase Storage
export async function uploadInterventionPhoto(
  file: File,
  interventionId: string
): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `interventions/${interventionId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('it-access-file')
    .upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('it-access-file').getPublicUrl(path)
  return data.publicUrl
}

// Upload du PDF vers Supabase Storage et enregistrement de l'URL
export async function uploadAndSavePdf(
  interventionId: string,
  pdfBlob: Blob
): Promise<string> {
  const path = `pdfs/${interventionId}/${Date.now()}.pdf`
  const { error } = await supabase.storage
    .from('it-access-file')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('it-access-file').getPublicUrl(path)
  await supabase.from('interventions').update({ pdf_url: data.publicUrl }).eq('id', interventionId)
  return data.publicUrl
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',')
  const mime = arr[0].match(/:(.*?);/)![1]
  const bstr = atob(arr[1])
  let n = bstr.length
  const u8arr = new Uint8Array(n)
  while (n--) u8arr[n] = bstr.charCodeAt(n)
  return new Blob([u8arr], { type: mime })
}
