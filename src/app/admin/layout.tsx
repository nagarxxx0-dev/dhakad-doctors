import Link from 'next/link'
import { LayoutDashboard, CheckSquare, FileText, Settings } from 'lucide-react'

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
      name: 'Settings',
      href: '/admin/settings',
      icon: Settings,
    },
  ]

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 hidden md:block">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-wider">
            Admin Panel
          </h2>
        </div>
        <nav className="px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <item.icon className="w-5 h-5 mr-3 text-gray-500 group-hover:text-gray-900 dark:text-gray-400 dark:group-hover:text-white" />
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  )
}
