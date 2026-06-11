import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RegisterPayload {
  email: string
  password: string
  nom: string
  prenom?: string
  telephone?: string
  role: 'client' | 'technicien' | 'admin'
  nom_entreprise?: string
  ville?: string
  secteur?: string
  specialite?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: RegisterPayload = await req.json()
    const { email, password, nom, prenom, telephone, role, nom_entreprise, ville, secteur, specialite } = payload

    if (!email || !password || !nom || !role) {
      return json({ error: 'Champs obligatoires manquants: email, password, nom, role' }, 400)
    }
    if (!['client', 'technicien', 'admin'].includes(role)) {
      return json({ error: 'Rôle invalide. Valeurs acceptées: client, technicien, admin' }, 400)
    }
    if (role === 'client' && !nom_entreprise) {
      return json({ error: 'nom_entreprise est obligatoire pour le rôle client' }, 400)
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError) {
      return json({ error: authError.message }, 400)
    }

    const userId = authData.user.id

    const { error: userErr } = await supabaseAdmin
      .from('utilisateurs')
      .insert({
        id: userId,
        email,
        nom,
        prenom: prenom ?? null,
        telephone: telephone ?? null,
        role,
        compte_valide: false,
        est_actif: false,
      })
    if (userErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return json({ error: userErr.message }, 500)
    }

    if (role === 'client') {
      const code_signature = Math.floor(100000 + Math.random() * 900000).toString()
      const { error: clientErr } = await supabaseAdmin
        .from('clients')
        .insert({
          utilisateur_id: userId,
          nom_entreprise: nom_entreprise!,
          ville: ville ?? null,
          secteur: secteur ?? null,
          code_signature,
        })
      if (clientErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ error: clientErr.message }, 500)
      }
    } else if (role === 'technicien') {
      const { error: techErr } = await supabaseAdmin
        .from('techniciens')
        .insert({
          utilisateur_id: userId,
          specialite: specialite ?? null,
        })
      if (techErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return json({ error: techErr.message }, 500)
      }
    }

    // Notifier les admins qu'un nouveau compte attend validation
    const { data: admins } = await supabaseAdmin
      .from('utilisateurs')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .eq('est_actif', true)

    if (admins && admins.length > 0) {
      const libelle = role === 'client' ? (nom_entreprise ?? 'Entreprise') : 'Technicien'
      const notifications = admins.map((admin: { id: string }) => ({
        utilisateur_id: admin.id,
        type: 'nouveau_compte_en_attente',
        titre: 'Nouveau compte à valider',
        corps: `${nom} (${libelle}) vient de s'inscrire.`,
        lien: null,
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return json({ success: true, userId }, 201)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return json({ error: message }, 500)
  }
})

function json(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
