import Link from 'next/link'
import { ArrowRight, Search, UserPlus, Shield } from 'lucide-react'
import Stories from '@/components/Stories'

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20 lg:py-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M0 100 C 20 0 50 0 100 100 Z" fill="white" />
          </svg>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Uniting Dhakad Doctors
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto mb-10">
            A dedicated community platform for networking, knowledge sharing, and professional growth.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 md:text-lg transition-colors shadow-lg"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Join Community
            </Link>
            <Link
              href="/directory"
              className="inline-flex items-center justify-center px-8 py-3 border border-white/30 text-base font-medium rounded-md text-white bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm md:text-lg transition-colors"
            >
              <Search className="w-5 h-5 mr-2" />
              Find Doctors
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="p-6 rounded-xl bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Verified Profiles</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Connect with verified medical professionals within the Dhakad community.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Networking</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Expand your professional network and collaborate with peers.
              </p>
            </div>
            <div className="p-6 rounded-xl bg-blue-50 dark:bg-gray-800 border border-blue-100 dark:border-gray-700">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <ArrowRight className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Growth</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Access resources, share success stories, and grow together.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stories Section */}
      <Stories />

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0 text-center md:text-left">
            <span className="text-2xl font-bold text-white">Dhakad Doctors</span>
            <p className="text-sm mt-1 text-gray-400">Empowering the medical community.</p>
          </div>
          <div className="flex space-x-8">
            <Link href="/directory" className="hover:text-white transition-colors">Directory</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            <Link href="/signup" className="hover:text-white transition-colors">Join</Link>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 pt-8 border-t border-gray-800 text-sm text-center text-gray-500">
          &copy; {new Date().getFullYear()} Dhakad Doctors. All rights reserved.
        </div>
      </footer>
    </div>
  )
}