/**
 * Mapeamento e normalização de nomes de instituições financeiras (aliasing).
 * Garante que variações como "Banco CSF" e "Atacadão" apontem para o mesmo cartão "Atacadão".
 */

export function normalizeBankName(bankName: string): string {
  if (!bankName) return 'Outros';
  const clean = bankName.trim();
  const upper = clean.toUpperCase();

  if (upper.includes('CSF') || upper.includes('ATACADAO') || upper.includes('ATACADÃO')) {
    return 'Atacadão';
  }
  if (upper.includes('NUBANK') || upper.includes('NU PAGAMENTOS')) {
    return 'Nubank';
  }
  if (upper.includes('ITAU') || upper.includes('ITAÚ')) {
    return 'Itaú';
  }
  if (upper.includes('BRADESCO')) {
    return 'Bradesco';
  }
  if (upper.includes('SANTANDER')) {
    return 'Santander';
  }
  if (upper.includes('INTER')) {
    return 'Banco Inter';
  }
  if (upper.includes('C6')) {
    return 'C6 Bank';
  }
  if (upper.includes('XP')) {
    return 'XP Bank';
  }
  if (upper.includes('BTG')) {
    return 'BTG Pactual';
  }
  if (upper.includes('PICPAY') || upper.includes('PIC PAY')) {
    return 'PicPay';
  }
  if (upper.includes('CAIXA')) {
    return 'Caixa';
  }
  if (upper.includes('BANCO DO BRASIL') || upper === 'BB') {
    return 'Banco do Brasil';
  }
  return clean;
}
