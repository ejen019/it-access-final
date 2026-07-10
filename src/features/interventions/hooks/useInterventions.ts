import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { StatutIntervention, NiveauUrgence, TypePlanification } from '@/types'

export type InterventionInput = {
  client_id: string
  equipement_ids: string[]      // IDs des équipements concernés
  titre: string
  description: string
  urgence: NiveauUrgence
  technicien_ids: string[]      // IDs de la table techniciens
  cree_par: string
  type_planification?: TypePlanification
  planifie_le?: string
}

// ----- Helpers notifications -----

async function notifierAdmins(payload: { type: string; titre: string; corps: string; lien?: string }) {
  const { data: admins } = await supabase
    .from('utilisateurs')
    .select('id')
    .in('role', ['admin', 'super_admin'])
  if (!admins?.length) return
  await supabase.from('notifications').insert(
    admins.map((a: any) => ({
      utilisateur_id: a.id,
      type: payload.type,
      titre: payload.titre,
      corps: payload.corps,
      lien: payload.lien ?? null,
    }))
  )
}

async function notifierClient(clientId: string, payload: { type: string; titre: string; corps: string; lien?: string }) {
  const { data: client } = await supabase
    .from('clients')
    .select('utilisateur_id')
    .eq('id', clientId)
    .single()
  if (!client?.utilisateur_id) return
  await supabase.from('notifications').insert({
    utilisateur_id: client.utilisateur_id,
    type: payload.type,
    titre: payload.titre,
    corps: payload.corps,
    lien: payload.lien ?? null,
  })
}

async function notifierTechniciens(technicienIds: string[], payload: { type: string; titre: string; corps: string; lien?: string }) {
  if (!technicienIds.length) return
  // Récupère les utilisateur_id depuis les techniciens
  const { data: techs } = await supabase
    .from('techniciens')
    .select('utilisateur_id')
    .in('id', technicienIds)
  if (!techs?.length) return
  await supabase.from('notifications').insert(
    techs.map((t: any) => ({
      utilisateur_id: t.utilisateur_id,
      type: payload.type,
      titre: payload.titre,
      corps: payload.corps,
      lien: payload.lien ?? null,
    }))
  )
}

// ----- Queries -----

export function useToutesInterventions() {
  return useQuery({
    queryKey: ['interventions-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('interventions')
        .select('*, clients(nom_entreprise), interventions_equipements(equipement_id), interventions_techniciens(technicien_id)')
        .order('cree_le', { ascending: false })
      if (error) throw error
      return data ?? []
    },
  })
}

export function useInterventionsClient(clientId: string | undefined) {
  return useQuery({
    queryKey: ['interventions-client', clientId],
    queryFn: async () => {
      if (!clientId) return []
      const { data, error } = await supabase
        .from('interventions')
        .select('*, interventions_equipements(equipement_id), interventions_techniciens(technicien_id)')
        .eq('client_id', clientId)
        .order('cree_le', { ascending: false })
      if (error) throw error
      return data ?? []
    },
    enabled: !!clientId,
  })
}

// utilisateurId = utilisateurs.id du technicien connecté
export function useInterventionsTechnicien(utilisateurId: string | undefined) {
  return useQuery({
    queryKey: ['interventions-tech', utilisateurId],
    queryFn: async () => {
      if (!utilisateurId) return []
      // Récupère d'abord l'ID de la table techniciens
      const { data: tech } = await supabase
        .from('techniciens')
        .select('id')
        .eq('utilisateur_id', utilisateurId)
        .single()
      if (!tech) return []

      const { data, error } = await supabase
        .from('interventions_techniciens')
        .select('intervention_id, interventions(*, clients(nom_entreprise))')
        .eq('technicien_id', tech.id)
      if (error) throw error
      const list = (data ?? []).map((r: any) => r.interventions).filter(Boolean)
      return list.sort((a: any, b: any) => new Date(b.cree_le).getTime() - new Date(a.cree_le).getTime())
    },
    enabled: !!utilisateurId,
  })
}

export function useDetailIntervention(id: string | undefined) {
  return useQuery({
    queryKey: ['intervention-detail', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('interventions')
        .select(`
          *,
          clients(id, utilisateur_id, nom_entreprise, code_signature, telephone, adresse, ville),
          interventions_equipements(equipement_id, equipements(nom, modele, numero_serie)),
          interventions_techniciens(technicien_id, statut_affectation, techniciens(id, utilisateur_id, specialite, utilisateurs(nom, prenom, email))),
          rapports_intervention(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}

// ----- Mutations -----

export function useCreerIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: InterventionInput) => {
      // 1. Créer l'intervention
      const { data, error } = await supabase
        .from('interventions')
        .insert({
          client_id: input.client_id,
          titre: input.titre,
          description: input.description,
          urgence: input.urgence,
          statut: 'planifiee',
          type_planification: input.type_planification ?? 'reparation',
          planifie_le: input.planifie_le ?? null,
          cree_par: input.cree_par,
          photos: [],
        })
        .select()
        .single()
      if (error || !data) throw error

      // 2. Lier les équipements
      if (input.equipement_ids.length) {
        await supabase.from('interventions_equipements').insert(
          input.equipement_ids.map((eid) => ({ intervention_id: data.id, equipement_id: eid }))
        )
      }

      // 3. Lier les techniciens
      if (input.technicien_ids.length) {
        await supabase.from('interventions_techniciens').insert(
          input.technicien_ids.map((tid) => ({ intervention_id: data.id, technicien_id: tid }))
        )
      }

      // 4. Notifications
      await Promise.all([
        notifierTechniciens(input.technicien_ids, {
          type: 'intervention_assignee',
          titre: 'Nouvelle mission assignée',
          corps: input.titre,
          lien: `/technicien/interventions/${data.id}`,
        }),
        notifierClient(input.client_id, {
          type: 'nouvelle_intervention',
          titre: 'Nouvelle intervention créée',
          corps: `Intervention : ${input.titre}${input.urgence === 'critique' ? ' (URGENT)' : ''}`,
          lien: `/entreprise/interventions/${data.id}`,
        }),
      ])

      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-client', data.client_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useValiderIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ interventionId, technicienIds, titre, clientId }: {
      interventionId: string
      technicienIds: string[]
      titre: string
      clientId: string
    }) => {
      if (technicienIds.length > 0) {
        const { error } = await supabase.from('interventions_techniciens').insert(
          technicienIds.map(tid => ({ intervention_id: interventionId, technicien_id: tid }))
        )
        if (error) throw error
      }
      await Promise.all([
        notifierClient(clientId, {
          type: 'intervention_mise_a_jour',
          titre: 'Panne prise en charge',
          corps: `"${titre}" a été validée — un technicien va intervenir.`,
          lien: `/entreprise/interventions/${interventionId}`,
        }),
        notifierTechniciens(technicienIds, {
          type: 'intervention_assignee',
          titre: 'Nouvelle mission assignée',
          corps: titre,
          lien: `/technicien/interventions/${interventionId}`,
        }),
      ])
      return { interventionId, clientId }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-detail', data.interventionId] })
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-client', data.clientId] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useChangerStatutIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, statut, extra = {},
    }: {
      id: string
      statut: StatutIntervention
      extra?: Record<string, unknown>
    }) => {
      const { data, error } = await supabase
        .from('interventions')
        .update({ statut, ...extra })
        .eq('id', id)
        .select('id, client_id, statut, titre')
        .single()
      if (error) throw error

      // Récupérer les techniciens liés
      const { data: techLinks } = await supabase
        .from('interventions_techniciens')
        .select('technicien_id')
        .eq('intervention_id', id)
      const techIds = (techLinks ?? []).map((t: any) => t.technicien_id)

      if (statut === 'terminee') {
        await notifierClient((data as any).client_id, {
          type: 'intervention_mise_a_jour',
          titre: 'Intervention à signer',
          corps: `"${(data as any).titre}" attend votre signature.`,
          lien: `/entreprise/interventions/${(data as any).id}`,
        })
      } else if (statut === 'en_cours') {
        await notifierClient((data as any).client_id, {
          type: 'intervention_mise_a_jour',
          titre: 'Intervention démarrée',
          corps: `Le technicien a démarré "${(data as any).titre}".`,
          lien: `/entreprise/interventions/${(data as any).id}`,
        })
      } else if (statut === 'annulee') {
        await Promise.all([
          notifierClient((data as any).client_id, {
            type: 'intervention_mise_a_jour',
            titre: 'Intervention annulée',
            corps: `"${(data as any).titre}" a été annulée.`,
            lien: `/entreprise/interventions/${(data as any).id}`,
          }),
          notifierTechniciens(techIds, {
            type: 'intervention_mise_a_jour',
            titre: 'Intervention annulée',
            corps: `"${(data as any).titre}" a été annulée par l'admin.`,
            lien: `/technicien/interventions/${(data as any).id}`,
          }),
        ])
      }

      return data
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-client', data.client_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-stats'] })
    },
  })
}

export function useSignerIntervention() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id, signatureDataUrl, equipementIds,
    }: {
      id: string
      signatureDataUrl: string
      equipementIds: string[]
    }) => {
      // 1. Upload signature
      const sigPath = `signatures/${id}/${Date.now()}.png`
      const sigBlob = dataUrlToBlob(signatureDataUrl)
      const { error: uploadErr } = await supabase.storage
        .from('it-access-fichiers')
        .upload(sigPath, sigBlob, { contentType: 'image/png', upsert: false })
      if (uploadErr) throw uploadErr

      const { data: sigUrlData } = supabase.storage
        .from('it-access-fichiers')
        .getPublicUrl(sigPath)

      // 2. Mettre à jour intervention
      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('interventions')
        .update({ statut: 'signee', signee_le: now })
        .eq('id', id)
        .select('id, client_id, titre')
        .single()
      if (error) throw error

      // 3. Enregistrer la signature sur le rapport existant
      await supabase.from('rapports_intervention').upsert({
        intervention_id: id,
        url_signature: sigUrlData.publicUrl,
        date_fin: now,
      }, { onConflict: 'intervention_id' })

      // 4. Remettre les équipements en opérationnel
      if (equipementIds.length) {
        await supabase
          .from('equipements')
          .update({ etat: 'operationnel' })
          .in('id', equipementIds)
      }

      // 5. Notifications
      const { data: techLinks } = await supabase
        .from('interventions_techniciens')
        .select('technicien_id')
        .eq('intervention_id', id)
      const techIds = (techLinks ?? []).map((t: any) => t.technicien_id)

      await Promise.all([
        notifierAdmins({
          type: 'intervention_mise_a_jour',
          titre: 'Intervention clôturée',
          corps: `"${(data as any).titre}" a été signée et clôturée.`,
          lien: `/admin/interventions/${(data as any).id}`,
        }),
        notifierTechniciens(techIds, {
          type: 'intervention_mise_a_jour',
          titre: 'Intervention signée',
          corps: `"${(data as any).titre}" a été signée. Mission terminée.`,
          lien: `/technicien/interventions/${(data as any).id}`,
        }),
      ])

      return { ...data, url_signature: sigUrlData.publicUrl }
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['intervention-detail', data.id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-all'] })
      queryClient.invalidateQueries({ queryKey: ['interventions-client', data.client_id] })
      queryClient.invalidateQueries({ queryKey: ['interventions-tech'] })
      queryClient.invalidateQueries({ queryKey: ['equipements'] })
      queryClient.invalidateQueries({ queryKey: ['equipements-all'] })
    },
  })
}

export async function uploadPhotoIntervention(file: File, interventionId: string): Promise<string> {
  const ext = file.name.split('.').pop()
  const path = `interventions/${interventionId}/${Date.now()}.${ext}`
  const { error } = await supabase.storage
    .from('it-access-fichiers')
    .upload(path, file, { upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('it-access-fichiers').getPublicUrl(path)
  return data.publicUrl
}

export async function uploadEtSauvegarderPdf(interventionId: string, pdfBlob: Blob): Promise<string> {
  const path = `pdfs/${interventionId}/${Date.now()}.pdf`
  const { error } = await supabase.storage
    .from('it-access-fichiers')
    .upload(path, pdfBlob, { contentType: 'application/pdf', upsert: false })
  if (error) throw error
  const { data } = supabase.storage.from('it-access-fichiers').getPublicUrl(path)
  await supabase
    .from('rapports_intervention')
    .upsert({ intervention_id: interventionId, url_pdf: data.publicUrl, description: '' }, { onConflict: 'intervention_id' })
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
