import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class AtacadaoInvoiceParser implements InvoiceParserStrategy {
  name = 'Atacadão';

  canParse(text: string): boolean {
    const upper = text.toUpperCase();
    return (
      upper.includes('CARTÃO ATACADÃO') ||
      upper.includes('CARTAO ATACADAO') ||
      upper.includes('BANCO CSF') ||
      upper.includes('ATACADÃO CARTÕES') ||
      upper.includes('ATACADAO CARTÕES') ||
      upper.includes('ATACADAO') ||
      upper.includes('ATACADÃO') ||
      // Faturas Atacadão podem só citar "FATURA MENSAL CARTÃO MASTERCARD GOLD" + "543882******5176"
      (upper.includes('FATURA MENSAL') && /\d{6}\*{6}\d{4}/.test(upper) && upper.includes('MASTERCARD GOLD'))
    );
  }

  parse(text: string): ExtractedInvoiceResult {
    const bankName = 'Atacadão';
    let brand = 'Mastercard';
    if (text.toUpperCase().includes('VISA')) brand = 'Visa';

    let last4Digits = '0000';
    const cardMatches = [...text.matchAll(/\d{6}\*{6}(\d{4})/g)];
    if (cardMatches.length > 0) {
      last4Digits = cardMatches[0][1];
    }

    let monthReferenced = new Date().toISOString().slice(0, 7);
    const dateMatch =
      text.match(/26\/(\d{2})\/(\d{4})/) ||
      text.match(/VENCIMENTO[\s\S]*?(\d{2})\/(\d{2})\/(\d{4})/i);

    if (dateMatch) {
      if (dateMatch[2] && dateMatch[2].length === 4) {
        const year = parseInt(dateMatch[2], 10);
        const month = parseInt(dateMatch[1], 10);
        monthReferenced = getPreviousMonthReference(year, month);
      } else if (dateMatch[3] && dateMatch[3].length === 4) {
        const year = parseInt(dateMatch[3], 10);
        const month = parseInt(dateMatch[2], 10);
        monthReferenced = getPreviousMonthReference(year, month);
      }
    }

    const items: ExtractedInvoiceItem[] = [];
    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      const matchHeader = line.match(/^(\d{2}\/\d{2})\s*(.*?)$/);
      if (matchHeader) {
        const dateStr = matchHeader[1];
        let descAndParc = matchHeader[2].trim();

        const nextLine = (lines[i + 1] || '').trim();
        const amountMatch = nextLine.match(/^([\d\.]+\,\d{2})(-)?$/);

        if (amountMatch) {
          const isNegative = Boolean(amountMatch[2]);
          const amountStr = amountMatch[1].replace(/\./g, '').replace(',', '.');
          let amount = parseFloat(amountStr);

          if (!isNaN(amount) && amount !== 0 && !descAndParc.toLowerCase().includes('pagamento')) {
            const isCredit = isNegative || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(descAndParc);
            if (isCredit) {
              amount = -Math.abs(amount);
            } else {
              amount = Math.abs(amount);
            }

            let currentInstallment = 1;
            let totalInstallments = 1;

            const instMatch = descAndParc.match(/(?:-\s*|\s+)(\d{1,2})\/(\d{1,2})$/);
            if (instMatch) {
              currentInstallment = parseInt(instMatch[1], 10);
              totalInstallments = parseInt(instMatch[2], 10);
              descAndParc = descAndParc.replace(/(?:-\s*|\s+)\d{1,2}\/\d{1,2}$/, '').trim();
            }

            items.push({
              description: descAndParc || 'Compra Atacadão',
              amount,
              currentInstallment,
              totalInstallments,
              purchaseDate: dateStr,
              cardLast4: last4Digits,
            });
          }
        }
      }
    }

    const totalAmount = items.reduce((acc, curr) => acc + curr.amount, 0);

    const cards: ParsedCardTransactions[] = [
      {
        bankName,
        brand,
        last4Digits,
        totalAmount: Math.round(totalAmount * 100) / 100,
        items,
      },
    ];

    return {
      monthReferenced,
      cards,
      extractedBy: 'regex',
    };
  }
}
