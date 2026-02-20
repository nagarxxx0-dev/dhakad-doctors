import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

type CookieSetOptions = Record<string, unknown>
type CookieStoreWithSet = {
  set: (name: string, value: string, options?: CookieSetOptions) => void
}

export async function createClient() {
  const cookieStore = await cookies()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    console.error('Invalid NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          const writableCookieStore = cookieStore as unknown as CookieStoreWithSet
          cookiesToSet.forEach(({ name, value, options }) =>
            writableCookieStore.set(name, value, options)
          )
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  })
}
