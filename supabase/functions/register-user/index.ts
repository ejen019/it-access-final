import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RegisterPayload {
  email: string
  password: string
  nom: string
  prenom: string
  telephone?: string
  role: 'client' | 'technicien' | 'admin'
  // Pour les clients
  nom_entreprise?: string
  ville?: string
  secteur?: string
  // Pour les techniciens
  specialite?: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: RegisterPayload = await req.json()
    const { email, password, nom, prenom, telephone, role, nom_entreprise, ville, secteur, specialite } = payload

    if (!email || !password || !nom || !prenom || !role) {
      return new Response(
        JSON.stringify({ error: 'Champs obligatoires manquants: email, password, nom, prenom, role' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['client', 'technicien', 'admin'].includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rôle invalide. Valeurs acceptées: client, technicien, admin' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (role === 'client' && !nom_entreprise) {
      return new Response(
        JSON.stringify({ error: 'nom_entreprise est obligatoire pour le rôle client' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Client admin avec service_role (bypass RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // 1. Créer l'utilisateur Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: false, // l'admin valide manuellement via compte_valide
    })

    if (authError) {
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const userId = authData.user.id

    // 2. Insérer dans utilisateurs
    const { error: userErr } = await supabaseAdmin
      .from('utilisateurs')
      .insert({
        id: userId,
        email,
        nom,
        prenom,
        telephone: telephone ?? null,
        role,
        compte_valide: false,
        est_actif: false,
      })

    if (userErr) {
      // Rollback: supprimer l'utilisateur auth créé
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return new Response(
        JSON.stringify({ error: userErr.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 3. Créer l'entrée métier selon le rôle
    if (role === 'client') {
      // Générer un code signature unique à 6 chiffres
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
        return new Response(
          JSON.stringify({ error: clientErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (role === 'technicien') {
      const { error: techErr } = await supabaseAdmin
        .from('techniciens')
        .insert({
          utilisateur_id: userId,
          specialite: specialite ?? null,
          disponible: true,
        })

      if (techErr) {
        await supabaseAdmin.auth.admin.deleteUser(userId)
        return new Response(
          JSON.stringify({ error: techErr.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // 4. Notifier les admins qu'un nouveau compte attend validation
    const { data: admins } = await supabaseAdmin
      .from('utilisateurs')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .eq('est_actif', true)

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: { id: string }) => ({
        utilisateur_id: admin.id,
        titre: 'Nouveau compte à valider',
        corps: `${prenom} ${nom} (${role === 'client' ? nom_entreprise : specialite ?? 'Technicien'}) vient de s'inscrire.`,
        lien: role === 'client' ? '/users?tab=pending' : '/users?tab=pending',
      }))
      await supabaseAdmin.from('notifications').insert(notifications)
    }

    return new Response(
      JSON.stringify({ success: true, userId }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
