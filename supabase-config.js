import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// Replace ONLY these two values with your project's frontend-safe settings.
const SUPABASE_URL = 'https://fpovculmleopyojwltik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_sUxklb4yweAhjkiznNPTSA_-Kmnq-In';

export const BUCKET = 'liquiddrop-files';
export const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MiB; also change setup.sql.

export const configured = SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_KEY.startsWith('YOUR_');

export const supabase = configured ? createClient(
  SUPABASE_URL,
  SUPABASE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
) : null;