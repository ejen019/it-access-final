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
    .from('profiles')
    .select('role')
    .eq('id', me.user.id)
    .single()

  await supabase.from('audit_logs').insert({
    actor_id: me.user.id,
    actor_role: profile?.role ?? null,
    action: payload.action,
    entity_type: payload.entityType,
    entity_id: payload.entityId ?? null,
    details: (payload.details ?? {}) as Json,
  })
}
