import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Support both Next.js (NEXT_PUBLIC_) and Expo (EXPO_PUBLIC_) env variables
const getSupabaseConfig = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL;

  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return { supabaseUrl, supabaseAnonKey };
};

let supabaseClient: SupabaseClient | null = null;

const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      'Supabase environment variables are required before calling the Supabase API. Set NEXT_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL, and NEXT_PUBLIC_SUPABASE_ANON_KEY or EXPO_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }

  supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      flowType: 'implicit',
    },
  });

  return supabaseClient;
};

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop as keyof SupabaseClient];

    return typeof value === 'function' ? value.bind(client) : value;
  },
});
