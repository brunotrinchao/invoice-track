export function getBankLogoPath(bankName: string | undefined | null): string | null {
  if (!bankName) return null

  const normalized = bankName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()

  if (normalized.includes('inter')) return '/logos/inter.svg'
  if (normalized.includes('nu')) return '/logos/nubank.svg'
  if (normalized.includes('itau')) return '/logos/itau.svg'
  if (normalized.includes('bradesco')) return '/logos/bradesco.svg'
  if (normalized.includes('santander')) return '/logos/santander.svg'
  if (normalized.includes('caixa')) return '/logos/caixa.svg'
  if (normalized.includes('c6')) return '/logos/c6.svg'
  if (normalized.includes('mercado') || normalized.includes('pago')) return '/logos/mercadopago.svg'
  if (normalized.includes('xp')) return '/logos/xp.svg'
  if (normalized.includes('picpay') || normalized.includes('pic pay')) return '/logos/picpay.svg'
  if (normalized.includes('brasil') || normalized === 'bb') return '/logos/bb.svg'
  if (normalized.includes('bmg')) return '/logos/bmg.svg'
  if (normalized.includes('btg')) return '/logos/btg.svg'
  if (normalized.includes('pan')) return '/logos/pan.svg'
  if (normalized.includes('safra')) return '/logos/safra.svg'
  if (normalized.includes('sicoob')) return '/logos/sicoob.svg'
  if (normalized.includes('sicredi')) return '/logos/sicredi.svg'
  if (normalized.includes('cora')) return '/logos/cora.svg'
  if (normalized.includes('pagbank') || normalized.includes('pagseguro')) return '/logos/pagbank.svg'
  if (normalized.includes('neon')) return '/logos/neon.svg'
  if (normalized.includes('banrisul')) return '/logos/banrisul.svg'
  if (normalized.includes('daycoval')) return '/logos/daycoval.svg'
  if (normalized.includes('bs2')) return '/logos/bs2.svg'
  if (normalized.includes('original')) return '/logos/original.svg'
  if (normalized.includes('atacadao')) return '/logos/atacadao.svg'

  return null
}
