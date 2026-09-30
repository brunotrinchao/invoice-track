import { describe, expect, it } from 'vitest'
import { getBankLogoPath } from '../utils/bankLogo'
import { getCardBrandLogoPath } from '../utils/cardBrandLogo'

describe('bankLogo utility', () => {
  it('returns correct SVG path for known banks', () => {
    expect(getBankLogoPath('Banco Inter')).toBe('/logos/inter.svg')
    expect(getBankLogoPath('Nubank')).toBe('/logos/nubank.svg')
    expect(getBankLogoPath('Itaú')).toBe('/logos/itau.svg')
    expect(getBankLogoPath('Bradesco')).toBe('/logos/bradesco.svg')
    expect(getBankLogoPath('Santander')).toBe('/logos/santander.svg')
    expect(getBankLogoPath('Caixa')).toBe('/logos/caixa.svg')
    expect(getBankLogoPath('C6 Bank')).toBe('/logos/c6.svg')
    expect(getBankLogoPath('Mercado Pago')).toBe('/logos/mercadopago.svg')
    expect(getBankLogoPath('XP')).toBe('/logos/xp.svg')
  })

  it('returns null for empty or unknown bank names', () => {
    expect(getBankLogoPath('')).toBeNull()
    expect(getBankLogoPath(null)).toBeNull()
    expect(getBankLogoPath('Banco Desconhecido ABC 123')).toBeNull()
  })
})

describe('cardBrandLogo utility', () => {
  it('returns correct SVG path for card brands', () => {
    expect(getCardBrandLogoPath('Visa')).toBe('/card-brands/flat-rounded/visa.svg')
    expect(getCardBrandLogoPath('Mastercard')).toBe('/card-brands/flat-rounded/mastercard.svg')
    expect(getCardBrandLogoPath('Elo')).toBe('/card-brands/flat-rounded/elo.svg')
    expect(getCardBrandLogoPath('American Express', 'logo')).toBe('/card-brands/logo/amex.svg')
  })

  it('returns null for unknown brand', () => {
    expect(getCardBrandLogoPath('Desconhecido')).toBeNull()
    expect(getCardBrandLogoPath(null)).toBeNull()
  })
})
