import { describe, expect, it } from 'vitest'
import { formatMoney } from '../utils/money'

describe('formatMoney', () => {
  it('formata valores positivos em BRL pt-BR', () => {
    expect(formatMoney(1234.56)).toContain('R$')
    expect(formatMoney(1234.56)).toContain('1.234,56')
  })

  it('formata negativos', () => {
    expect(formatMoney(-50.5)).toContain('-')
  })

  it('coerces null/undefined para R$ 0,00', () => {
    expect(formatMoney(null)).toBe(formatMoney(0))
    expect(formatMoney(undefined)).toBe(formatMoney(0))
  })

  it('arredonda para 2 casas (padrão Intl)', () => {
    expect(formatMoney(10.999)).toContain('11,00')
  })
})