import { createClient } from '@/utils/supabase/server'
import Search from './search'
import Image from 'next/image'
import { User, Stethoscope } from 'lucide-react'

export default async function DirectoryPage(props: {
  searchParams: Promise<{ q?: string }>
}) {
  const searchParams = await props.searchParams
  const query = searchParams.q || ''
  const supabase = await createClient()

  let dbQuery = supabase
    .from('profiles')
    .select('*')
    .eq('status', 'approved')
    .order('full_name', { ascending: true })

  if (query) {
    dbQuery = dbQuery.ilike('full_name', `%${query}%`)
  }

  const { data: doctors } = await dbQuery

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Doctor Directory</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Find and connect with approved doctors in our community.
          </p>
        </div>
        <Search placeholder="Search doctors by name..." />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {doctors?.map((doctor) => (
          <div key={doctor.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow group">
            <div className="aspect-square relative bg-gray-100 dark:bg-gray-900 overflow-hidden">
              {doctor.avatar_url ? (
                <Image
                  src={doctor.avatar_url}
                  alt={doctor.full_name}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                  unoptimized
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <User className="w-20 h-20" />
                </div>
              )}
            </div>
            <div className="p-5">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">
                {doctor.full_name}
              </h3>
              <div className="mt-2 flex items-center text-sm text-gray-600 dark:text-gray-300">
                <Stethoscope className="w-4 h-4 mr-2 text-blue-500" />
                <span className="truncate">{doctor.specialty || 'General Practitioner'}</span>
              </div>
            </div>
          </div>
        ))}
        {doctors?.length === 0 && (
          <div className="col-span-full text-center py-12 text-gray-500 dark:text-gray-400">
            No doctors found matching your search.
          </div>
        )}
      </div>
    </div>
  )
}
