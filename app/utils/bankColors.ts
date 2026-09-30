export const BANK_COLOR_MAP: Record<string, string> = {
  'Nubank': '#820AD1',
  'Itaú': '#EC7000',
  'Itau': '#EC7000',
  'Bradesco': '#CC092F',
  'Santander': '#EA1D2C',
  'Banco Inter': '#FF7A00',
  'Inter': '#FF7A00',
  'C6 Bank': '#38bdf8',
  'C6': '#38bdf8',
  'XP Bank': '#eab308',
  'XP': '#eab308',
  'BTG Pactual': '#2563eb',
  'BTG': '#2563eb',
  'PicPay': '#11C76F',
  'Caixa': '#0066B3',
  'BB': '#0038A8',
  'Banco do Brasil': '#0038A8',
}

export function getBankColor(bankName: string, fallbackColor = '#3b82f6'): string {
  if (!bankName) return fallbackColor
  for (const [key, color] of Object.entries(BANK_COLOR_MAP)) {
    if (bankName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(bankName.toLowerCase())) {
      return color
    }
  }
  return fallbackColor
}
