// Supabase Client Initialization
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Database]  Supabase Cloud PostgreSQL initialized successfully!');
  } catch (err) {
    console.warn('[Database] Failed to initialize Supabase client:', err.message);
  }
} else {
  // console.log('[Database] Supabase URL/Key not set in .env. Using standard local dual adapter.');
}

module.exports = {
  supabase,
  isSupabaseConfigured: () => !!supabase
};
