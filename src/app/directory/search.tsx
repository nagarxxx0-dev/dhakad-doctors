import Link from 'next/link'
import { Search as SearchIcon } from 'lucide-react'

interface DirectoryFilters {
  q: string
  district: string
  state: string
  specialization: string
  role: string
}

export default function Search({ values }: { values: DirectoryFilters }) {
  return (
    <form
      action="/directory"
      method="get"
      className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5"
    >
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <div className="relative xl:col-span-2">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="q"
            defaultValue={values.q}
            placeholder="Search name..."
            className="block w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
          />
        </div>

        <input
          name="district"
          defaultValue={values.district}
          placeholder="District"
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        <input
          name="state"
          defaultValue={values.state}
          placeholder="State"
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        <input
          name="specialization"
          defaultValue={values.specialization}
          placeholder="Specialization"
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        />

        <select
          name="role"
          defaultValue={values.role}
          className="block w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-900 dark:text-white"
        >
          <option value="">All Roles</option>
          <option value="doctor">Doctor</option>
          <option value="student">Student</option>
          <option value="public">Public User</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="inline-flex items-center rounded-xl bg-blue-900 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          Apply Filters
        </button>
        <Link
          href="/directory"
          className="inline-flex items-center rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          Clear
        </Link>
      </div>
    </form>
  )
}
