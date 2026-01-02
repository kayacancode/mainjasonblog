import { createClient } from "@supabase/supabase-js";

// Lazy initialization to avoid module-level errors when env vars aren't available
let supabaseInstance = null;

export function getSupabase() {
    if (!supabaseInstance) {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Missing Supabase environment variables (NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY)');
        }

        supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
    }
    return supabaseInstance;
}

// For backwards compatibility - but prefer using getSupabase()
export const supabase = new Proxy({}, {
    get(target, prop) {
        return getSupabase()[prop];
    }
});
