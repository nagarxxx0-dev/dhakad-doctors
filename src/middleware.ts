import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // 1. Create an initial response. We might modify this or replace it with a redirect.
  // This is required by @supabase/ssr to handle cookie setting on the response.
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Update the request cookies (for the current request processing)
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          // Update the response cookies (for the client)
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 2. Check Auth
  // IMPORTANT: Do not use getSession(), use getUser() for security in middleware
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/dashboard') || path.startsWith('/admin')
  const isAdminPath = path.startsWith('/admin')

  // 3. Handle Unauthenticated Access
  if (isProtected && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    // If we redirect, we return a new response, so we don't need to copy
    // session refresh cookies because the session is likely invalid/missing anyway.
    return NextResponse.redirect(url)
  }

  // 4. Handle Admin Access (RBAC)
  if (isAdminPath && user) {
    // Fetch profile role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // If not admin, redirect to dashboard
    if (profile?.role !== 'admin') {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      
      const redirectResponse = NextResponse.redirect(url)
      
      // CRITICAL: Copy cookies from the 'response' object (which might have a refreshed session)
      // to the redirect response to avoid session loss.
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return redirectResponse
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}