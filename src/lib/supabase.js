// src/lib/supabase.js
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://lydltwxkagtemqxounkm.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx5ZGx0d3hrYWd0ZW1xeG91bmttIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDUzMjQsImV4cCI6MjA3MTcyMTMyNH0.Ovz3JsOb0v3tlO0acJJyV-NoGU5Z0T4wjZ5lls4WFZY';

if (SUPABASE_URL.includes('YOUR-') || SUPABASE_ANON_KEY.includes('YOUR_')) {
  console.warn('[supabase] Inserisci URL e ANON KEY in src/lib/supabase.js');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});