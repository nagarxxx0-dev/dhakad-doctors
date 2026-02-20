'use client'

import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { signOut } from '@/app/auth/actions'

interface NavbarProps {
  user: User | null
  isAdmin: boolean
}

export default function Navbar({ user, isAdmin }: NavbarProps) {
  return (
    <div
      id="main-navbar"
      className="fixed top-0 left-0 right-0 z-[9999] w-full border-b border-gray-800 bg-gray-900 text-white shadow-lg"
      style={{ display: 'block' }}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="text-lg font-bold text-white">
          Dhakad Doctors
        </Link>

        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium">
          <Link href="/" className="text-white hover:text-blue-300">
            Home
          </Link>
          <Link href="/directory" className="text-white hover:text-blue-300">
            Directory
          </Link>
          {user && (
            <Link href="/dashboard" className="text-white hover:text-blue-300">
              Dashboard
            </Link>
          )}
          {isAdmin && (
            <Link href="/admin" className="text-red-300 hover:text-red-200">
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <form action={signOut}>
              <button
                type="submit"
                className="rounded bg-gray-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-800"
              >
                Sign Out
              </button>
            </form>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-white hover:text-blue-300">
                Log in
              </Link>
              <Link
                href="/signup"
                className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
