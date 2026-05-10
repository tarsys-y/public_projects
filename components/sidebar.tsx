'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  BookOpen,
  Brain,
  ChevronRight,
  Clock,
  Home,
  LineChart,
  Moon,
  Star,
  Sun,
  TrendingUp,
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/screener', label: 'Screener', icon: BarChart3, description: 'Filter all B3 stocks' },
  { href: '/portfolio', label: 'Portfolio', icon: TrendingUp, description: 'Your holdings & metrics' },
  { href: '/watchlist', label: 'Watchlist', icon: Star, description: 'Tracked stocks & alerts' },
  { href: '/backtester', label: 'Backtester', icon: Clock, description: 'Test strategies 2010–now' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  return (
    <aside className="flex h-screen w-56 flex-col border-r border-border bg-card px-3 py-4">
      {/* Logo */}
      <div className="mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <Brain className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <p className="font-serif text-sm font-semibold leading-none">B3 Dashboard</p>
            <p className="mt-0.5 text-[10px] text-muted-foreground">Multi-framework</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon, description }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'group flex items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors',
                active
                  ? 'bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="h-3 w-3 opacity-60" />}
            </Link>
          )
        })}
      </nav>

      {/* Knowledge base link */}
      <div className="border-t border-border pt-3">
        <Link
          href="/methodology"
          className="flex items-center gap-3 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          <span>Methodology</span>
        </Link>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          {theme === 'dark' ? (
            <Sun className="h-3.5 w-3.5" />
          ) : (
            <Moon className="h-3.5 w-3.5" />
          )}
          <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
        </button>
      </div>
    </aside>
  )
}
