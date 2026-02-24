import { getAdminStats } from './actions'
import { Users, Clock, Activity } from 'lucide-react'

export default async function AdminDashboard() {
  const stats = await getAdminStats()

  const cards = [
    {
      label: 'Total Members',
      value: String(stats.totalUsers),
      icon: Users,
      tone: 'text-blue-700 bg-blue-50 border-blue-100',
    },
    {
      label: 'Pending Approvals',
      value: String(stats.pendingApprovals),
      icon: Clock,
      tone: 'text-amber-700 bg-amber-50 border-amber-100',
    },
    {
      label: 'System Status',
      value: 'Operational',
      icon: Activity,
      tone: 'text-emerald-700 bg-emerald-50 border-emerald-100',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-blue-100 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-7">
        <div className="inline-flex rounded-full bg-blue-900 px-4 py-1.5 text-xs font-semibold tracking-wide text-blue-50">
          Admin Control
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-blue-950 dark:text-white sm:text-3xl">
          Dashboard Overview
        </h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-gray-300 sm:text-base">
          Monitor approvals, members, and platform status in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="p-5">
              <div className="flex items-center gap-4">
                <div className={`rounded-xl border p-3 ${card.tone}`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-gray-300">{card.label}</p>
                  <p className="text-2xl font-bold text-blue-950 dark:text-white">{card.value}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
