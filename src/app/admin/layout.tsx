import Link from 'next/link'
import { LayoutDashboard, CheckSquare, FileText, Settings, Layers3 } from 'lucide-react'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const navItems = [
    {
      name: 'Dashboard',
      href: '/admin',
      icon: LayoutDashboard,
    },
    {
      name: 'Approvals',
      href: '/admin/approvals',
      icon: CheckSquare,
    },
    {
      name: 'CMS / Stories',
      href: '/admin/cms',
      icon: FileText,
    },
    {
      name: 'Committee',
      href: '/admin/committee',
      icon: Layers3,
    },
    {
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-slate-50 dark:bg-gray-900">
      <div className="border-b border-blue-100 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 md:hidden">
        <nav className="flex gap-2 overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            >
              <item.icon className="h-4 w-4" />
              {item.name}
            </Link>
          ))}
        </nav>
      </div>

      {/* Sidebar */}
      <aside className="hidden w-64 border-r border-blue-100 bg-white dark:border-gray-700 dark:bg-gray-800 md:block">
        <div className="border-b border-blue-100 bg-blue-900 p-6 dark:border-gray-700 dark:bg-blue-950">
          <h2 className="text-lg font-bold uppercase tracking-wider text-blue-50">
            Admin Panel
          </h2>
        </div>
        <nav className="space-y-1 px-4 py-4">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="group flex items-center rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-900 dark:text-gray-200 dark:hover:bg-gray-700 dark:hover:text-white"
            >
              <item.icon className="mr-3 h-5 w-5 text-slate-500 group-hover:text-blue-900 dark:text-gray-400 dark:group-hover:text-white" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  )
}
