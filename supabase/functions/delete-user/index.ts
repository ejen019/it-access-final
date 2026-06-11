import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Non authentifié.' }, 401)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Vérifier que l'appelant est admin ou super_admin
    const token = authHeader.replace('Bearer ', '')
    const { data: caller } = await supabaseAdmin.auth.getUser(token)
    if (!caller.user) {
      return json({ error: 'Session invalide.' }, 401)
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('utilisateurs')
      .select('role')
      .eq('id', caller.user.id)
      .single()

    if (!callerProfile || !['admin', 'super_admin'].includes(callerProfile.role)) {
      return json({ error: 'Action réservée aux administrateurs.' }, 403)
    }

    // 2. Valider la cible
    const { userId } = await req.json()
    if (!userId) {
      return json({ error: 'userId manquant.' }, 400)
    }
    if (userId === caller.user.id) {
      return json({ error: 'Vous ne pouvez pas supprimer votre propre compte.' }, 400)
    }

    // 3. Empêcher un admin de supprimer un super_admin
    const { data: target } = await supabaseAdmin
      .from('utilisateurs')
      .select('role')
      .eq('id', userId)
      .single()

    if (target?.role === 'super_admin' && callerProfile.role !== 'super_admin') {
      return json({ error: 'Seul un super administrateur peut supprimer un super administrateur.' }, 403)
    }

    // 4. Supprimer l'utilisateur Auth.
    // Les tables liées (utilisateurs, clients, techniciens…) sont nettoyées
    // par ON DELETE CASCADE défini dans le schéma SQL.
    const { error: delError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (delError) {
      return json({ error: delError.message }, 500)
    }

    return json({ success: true }, 200)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne.'
    return json({ error: message }, 500)
  }
})

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
