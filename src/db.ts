/**
 * src/db.ts
 * Supabase connection adapter.
 * Uses the @supabase/supabase-js client (no local Postgres required).
 * Reads credentials from environment variables (SUPABASE_URL + SUPABASE_SERVICE_KEY).
 * The service-role key is required on the server to bypass Row Level Security.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || '';

let _client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey) return null;
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseKey);
  }
  return _client;
}

// Compatibility shim — used by syncToPostgres.ts
// Instead of pool.query, we expose a supabase-based query wrapper
export const pool = {
  query: async (sql: string, params?: any[]): Promise<{ rows: any[] }> => {
    // We don't use raw SQL via the JS client directly.
    // This stub exists only so syncToPostgres.ts can import 'pool' without crashing.
    // Real writes go through the supabase client's .from().upsert() API.
    console.warn('[db.ts pool.query] Raw SQL via pool not supported with Supabase JS client. Use getClient() instead.');
    return { rows: [] };
  },
  connect: async () => {
    throw new Error('pool.connect() is not supported in Supabase JS mode. Use getClient() instead.');
  }
};
