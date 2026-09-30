export function getCardBrandLogoPath(
  brand: string | undefined | null,
  variant: 'flat-rounded' | 'logo' = 'flat-rounded'
): string | null {
  if (!brand) return null

  const normalized = brand
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim()

  let file: string | null = null

  if (normalized.includes('visa')) file = 'visa.svg'
  else if (normalized.includes('master')) file = 'mastercard.svg'
  else if (normalized.includes('elo')) file = 'elo.svg'
  else if (normalized.includes('amex') || normalized.includes('american')) file = 'amex.svg'
  else if (normalized.includes('hipercard')) file = 'hipercard.svg'
  else if (normalized.includes('hiper')) file = 'hiper.svg'
  else if (normalized.includes('diners')) file = 'diners.svg'
  else if (normalized.includes('discover')) file = 'discover.svg'
  else if (normalized.includes('jcb')) file = 'jcb.svg'
  else if (normalized.includes('maestro')) file = 'maestro.svg'
  else if (normalized.includes('union')) file = 'unionpay.svg'
  else if (normalized.includes('paypal')) file = 'paypal.svg'
  else if (normalized.includes('alipay')) file = 'alipay.svg'

  return file ? `/card-brands/${variant}/${file}` : null
}
