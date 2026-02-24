export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-7">
        <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
          Configuration
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
          Admin Settings
        </h1>
      </div>
      <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Settings module is available and ready for configuration upgrades.
        </p>
      </div>
    </div>
  )
}
