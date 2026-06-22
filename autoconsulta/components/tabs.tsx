'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import { CpfValidator } from '@/components/cpf-validator'
import { CnpjLookup } from '@/components/cnpj-lookup'
import { CpfStatusTool } from '@/components/cpf-status'
import { BreachCheck } from '@/components/breach-check'

const TABS = [
  { value: 'validador', label: 'Validador', node: <CpfValidator /> },
  { value: 'cnpj', label: 'CNPJ & Sócios', node: <CnpjLookup /> },
  { value: 'receita', label: 'Situação Receita', node: <CpfStatusTool /> },
  { value: 'vazamentos', label: 'Vazamentos', node: <BreachCheck /> },
]

export function ToolTabs() {
  return (
    <TabsPrimitive.Root defaultValue="validador">
      <TabsPrimitive.List className="flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <TabsPrimitive.Trigger
            key={t.value}
            value={t.value}
            className="rounded-t-lg px-4 py-2 text-sm font-medium text-slate-500 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm"
          >
            {t.label}
          </TabsPrimitive.Trigger>
        ))}
      </TabsPrimitive.List>

      {TABS.map((t) => (
        <TabsPrimitive.Content
          key={t.value}
          value={t.value}
          className="rounded-b-lg rounded-tr-lg bg-white p-5 shadow-sm focus:outline-none"
        >
          {t.node}
        </TabsPrimitive.Content>
      ))}
    </TabsPrimitive.Root>
  )
}
