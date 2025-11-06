import { createServerClient } from "@supabase/ssr";

/**
 * Returns a Supabase server client.
 * @param {import('next').NextApiRequest['cookies']} cookies
 */
export const supabaseServer = (cookies) => {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { cookies }
  );
};
