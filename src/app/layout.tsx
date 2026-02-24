import type { Metadata } from 'next'
import type { User } from '@supabase/supabase-js'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { createClient } from '@/utils/supabase/server'
import { Toaster } from 'sonner'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Dhakad Doctors',
  description: 'Community portal for Dhakad Doctors',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let user: User | null = null
  let isAdmin = false

  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()
    user = authUser

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle()

      isAdmin = profile?.role === 'admin'
    }
  } catch (error) {
    console.error('Root layout auth check failed:', error)
    user = null
    isAdmin = false
  }
  return (
    <html lang="en">
      {/* c:\projects\dhakad-doctors\src\app\layout.tsx */}
      <body className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100 flex flex-col`}>
        <Navbar user={user} isAdmin={isAdmin} />
        <main className="flex-1 pt-16">{children}</main>
        <Toaster />
      </body>
    </html>
  )
}

