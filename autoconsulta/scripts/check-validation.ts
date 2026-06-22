/**
 * Verificação offline dos validadores de CPF/CNPJ.
 * Uso: npm run check:validation
 *
 * Os CPFs/CNPJs "válidos" abaixo são números estruturalmente corretos usados
 * apenas para testar o algoritmo de dígitos verificadores — não pertencem a
 * ninguém e nenhum dado é consultado.
 */
import { isValidCpf, formatCpf, cleanCpf } from '../lib/validation/cpf'
import { isValidCnpj, formatCnpj, cleanCnpj } from '../lib/validation/cnpj'

let failures = 0

function assert(label: string, got: unknown, expected: unknown) {
  const pass = got === expected
  if (!pass) failures++
  const mark = pass ? '✓' : '✗'
  console.log(`${mark} ${label} → ${JSON.stringify(got)} (esperado ${JSON.stringify(expected)})`)
}

console.log('— CPF —')
assert('CPF válido 529.982.247-25', isValidCpf('529.982.247-25'), true)
assert('CPF válido 111.444.777-35', isValidCpf('11144477735'), true)
assert('CPF inválido (DV errado)', isValidCpf('529.982.247-20'), false)
assert('CPF sequência repetida', isValidCpf('111.111.111-11'), false)
assert('CPF curto', isValidCpf('123'), false)
assert('CPF vazio', isValidCpf(''), false)
assert('formatCpf', formatCpf('52998224725'), '529.982.247-25')
assert('cleanCpf', cleanCpf('529.982.247-25'), '52998224725')

console.log('\n— CNPJ —')
assert('CNPJ válido 11.222.333/0001-81', isValidCnpj('11.222.333/0001-81'), true)
assert('CNPJ válido 04.252.011/0001-10', isValidCnpj('04252011000110'), true)
assert('CNPJ inválido (DV errado)', isValidCnpj('11.222.333/0001-80'), false)
assert('CNPJ sequência repetida', isValidCnpj('11.111.111/1111-11'), false)
assert('CNPJ curto', isValidCnpj('123'), false)
assert('formatCnpj', formatCnpj('11222333000181'), '11.222.333/0001-81')
assert('cleanCnpj', cleanCnpj('11.222.333/0001-81'), '11222333000181')

console.log(`\n${failures === 0 ? '✅ Todos os testes passaram.' : `❌ ${failures} falha(s).`}`)
process.exit(failures === 0 ? 0 : 1)
