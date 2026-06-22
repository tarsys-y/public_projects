import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Autoconsulta',
  description:
    'Ferramentas independentes de autoconsulta: validação de CPF/CNPJ, dados públicos de empresa, situação do próprio titular e checagem de vazamentos.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
