import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminPayload {
  email: string
  password: string
  nom: string
  prenom?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // 1. Vérifier que l'appelant est bien super_admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return json({ error: 'Non authentifié.' }, 401)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

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

    if (callerProfile?.role !== 'super_admin') {
      return json({ error: 'Action réservée au super administrateur.' }, 403)
    }

    // 2. Valider le payload
    const { email, password, nom, prenom }: CreateAdminPayload = await req.json()
    if (!email || !password || !nom) {
      return json({ error: 'Champs requis : email, password, nom.' }, 400)
    }
    if (password.length < 8) {
      return json({ error: 'Le mot de passe doit contenir au moins 8 caractères.' }, 400)
    }

    // 3. Créer l'utilisateur Auth (email confirmé : un admin n'attend pas de validation)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) {
      return json({ error: authError.message }, 400)
    }

    const userId = authData.user.id

    // 4. Insérer dans utilisateurs avec rôle admin, déjà validé et actif
    const { error: insertError } = await supabaseAdmin
      .from('utilisateurs')
      .insert({
        id: userId,
        email,
        nom,
        prenom: prenom ?? null,
        role: 'admin',
        compte_valide: true,
        est_actif: true,
      })

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return json({ error: insertError.message }, 500)
    }

    return json({ success: true, userId }, 201)
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
