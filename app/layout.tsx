import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'B3 Investment Dashboard',
    template: '%s | B3 Investment Dashboard',
  },
  description:
    'Multi-framework investment analysis for Brazilian stocks — Graham, Fisher, Greenblatt, Damodaran, Simons & more.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head />
      <body>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
