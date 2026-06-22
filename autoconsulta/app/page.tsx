import { ToolTabs } from '@/components/tabs'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Autoconsulta</h1>
        <p className="mt-2 text-sm text-slate-600">
          Quatro ferramentas <strong>independentes</strong>. Cada uma opera sobre os
          seus <strong>próprios</strong> dados ou sobre dados públicos de uma{' '}
          <strong>empresa</strong> (CNPJ). Nada é cruzado entre as abas e não há
          perfilamento de pessoas a partir de um CPF.
        </p>
      </header>

      <ToolTabs />

      <footer className="mt-10 text-xs text-slate-400">
        Use apenas com dados que são seus ou publicamente atribuíveis a empresas.
        Respeite a LGPD: não agregue dados de terceiros sem base legal.
      </footer>
    </main>
  )
}
