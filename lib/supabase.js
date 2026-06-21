const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Ensure SUPABASE_URL and SUPABASE_ANON_KEY are set.');
}

const supabase = createClient(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseAnonKey || 'placeholder-anon-key', {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Admin client using service role key (useful for user creations/bypassing RLS in internal scripts)
const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl || 'https://placeholder-url.supabase.co', supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : supabase;

module.exports = { supabase, supabaseAdmin };
