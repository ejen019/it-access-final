// =============================================================
// Client Supabase — point d'entrée unique pour toute l'app
// Import ce fichier partout où tu as besoin de Supabase.
// =============================================================
import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables Supabase manquantes dans .env.local')
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Persiste la session dans localStorage pour survivre aux rechargements
    persistSession: true,
    autoRefreshToken: true,
  },
})
