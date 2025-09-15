import { createClient } from '@supabase/supabase-js';

/**
 * Creates a browser/client-side Supabase client. This client is used to
 * authenticate users and perform CRUD operations against your Supabase
 * Postgres database. Environment variables are used to configure the
 * connection.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default supabase;
