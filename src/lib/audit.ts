import { supabase } from '@/lib/supabase/client'
import type { Json } from '@/lib/supabase/database.types'

type AuditPayload = {
  action: string
  entityType: string
  entityId?: string | null
  details?: Record<string, unknown>
}

export async function logAuditAction(payload: AuditPayload) {
  const { data: me } = await supabase.auth.getUser()
  if (!me.user) return

  const { data: profile } = await supabase
    .from('utilisateurs')
    .select('role')
    .eq('id', me.user.id)
    .single()

  await supabase.from('journaux_audit').insert({
    acteur_id: me.user.id,
    role_acteur: profile?.role ?? null,
    action: payload.action,
    type_entite: payload.entityType,
    entite_id: payload.entityId ?? null,
    details: (payload.details ?? {}) as Json,
  })
}
