import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class GenericInvoiceParser implements InvoiceParserStrategy {
  name = 'Generic';

  canParse(text: string): boolean {
    return true; // Fallback para qualquer fatura
  }

  parse(text: string): ExtractedInvoiceResult {
    const textUpper = text.toUpperCase();

    let bankName = 'Cartão de Crédito';
    if (textUpper.includes('NUBANK') || textUpper.includes('NU PAGAMENTOS')) bankName = 'Nubank';
    else if (textUpper.includes('ITAÚ') || textUpper.includes('ITAU') || textUpper.includes('ITUPREMIER')) bankName = 'Itaú';
    else if (textUpper.includes('BRADESCO') || textUpper.includes('BRADESCARD')) bankName = 'Bradesco';
    else if (textUpper.includes('SANTANDER')) bankName = 'Santander';
    else if (textUpper.includes('C6 BANK') || textUpper.includes('C6')) bankName = 'C6 Bank';
    else if (textUpper.includes('XP INVESTIMENTOS') || textUpper.includes('XP BANK')) bankName = 'XP Bank';
    else if (textUpper.includes('BTG PACTUAL') || textUpper.includes('BTG')) bankName = 'BTG Pactual';

    let brand = 'Mastercard';
    if (textUpper.includes('VISA')) brand = 'Visa';
    else if (textUpper.includes('MASTERCARD') || textUpper.includes('MASTER')) brand = 'Mastercard';
    else if (textUpper.includes('ELO')) brand = 'Elo';
    else if (textUpper.includes('AMERICAN EXPRESS') || textUpper.includes('AMEX')) brand = 'Amex';

    let monthReferenced = new Date().toISOString().slice(0, 7);
    const dateMatch =
      text.match(/vencimento[:\s]*(\d{2})[\/\.-](\d{2})[\/\.-](\d{4}|\d{2})/i) ||
      text.match(/(\d{2})[\/\.-](\d{2})[\/\.-](\d{4})/);
    if (dateMatch) {
      const month = parseInt(dateMatch[2], 10);
      let yearStr = dateMatch[3];
      if (yearStr.length === 2) yearStr = `20${yearStr}`;
      const year = parseInt(yearStr, 10);
      monthReferenced = getPreviousMonthReference(year, month);
    }

    const cardItemsMap: Record<string, ExtractedInvoiceItem[]> = {};

    let currentCardLast4 = '0000';
    const last4Match =
      text.match(/(?:final|dígitos|card|cartão|••••|\*\*\*\*)\s*(\d{4})/i);
    if (last4Match && last4Match[1]) {
      currentCardLast4 = last4Match[1];
    }
    cardItemsMap[currentCardLast4] = [];

    const lines = text.split(/\r?\n/);
    const moneyRegex = /R?\$\s*([\d\.]+\,\d{2})/g;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.length < 5) continue;

      const cardMatch = trimmed.match(/(?:final|cartão)\s*(\d{4})/i);
      if (cardMatch) {
        currentCardLast4 = cardMatch[1];
        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }
      }

      const moneyMatches = [...trimmed.matchAll(moneyRegex)];
      if (moneyMatches.length > 0) {
        const lastMoney = moneyMatches[moneyMatches.length - 1][1];
        const amountStr = lastMoney.replace(/\./g, '').replace(',', '.');
        let amount = parseFloat(amountStr);

        if (isNaN(amount) || amount === 0) continue;

        const isNegative = trimmed.includes('-') || trimmed.endsWith('-');

        const instMatch = trimmed.match(/(\d{1,2})\/(\d{1,2})/) || trimmed.match(/(\d{1,2})\s*de\s*(\d{1,2})/i);
        let currentInstallment = 1;
        let totalInstallments = 1;

        if (instMatch) {
          currentInstallment = parseInt(instMatch[1], 10);
          totalInstallments = parseInt(instMatch[2], 10);
        }

        let description = trimmed
          .replace(moneyRegex, '')
          .replace(/(\d{1,2})\/(\d{1,2})/, '')
          .replace(/(\d{2})[\/\.-](\d{2})/, '')
          .trim();

        const isCredit = isNegative || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(description);
        if (isCredit) {
          amount = -Math.abs(amount);
        } else {
          amount = Math.abs(amount);
        }

        if (description.length > 3 && !description.toLowerCase().includes('total') && !description.toLowerCase().includes('pagamento')) {
          if (!cardItemsMap[currentCardLast4]) {
            cardItemsMap[currentCardLast4] = [];
          }
          cardItemsMap[currentCardLast4].push({
            description: description.slice(0, 80),
            amount,
            currentInstallment: currentInstallment || 1,
            totalInstallments: totalInstallments || 1,
            cardLast4: currentCardLast4,
          });
        }
      }
    }

    const cards: ParsedCardTransactions[] = Object.entries(cardItemsMap)
      .filter(([_, items]) => items.length > 0)
      .map(([last4, items]) => {
        const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
        return {
          bankName,
          brand,
          last4Digits: last4,
          totalAmount: Math.round(totalAmount * 100) / 100,
          items,
        };
      });

    if (cards.length === 0) {
      cards.push({
        bankName,
        brand,
        last4Digits: currentCardLast4,
        totalAmount: 0,
        items: [],
      });
    }

    return {
      monthReferenced,
      cards,
      extractedBy: 'regex',
    };
  }
}
