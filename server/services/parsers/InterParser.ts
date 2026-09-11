import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class InterInvoiceParser implements InvoiceParserStrategy {
  name = 'Banco Inter';

  canParse(text: string): boolean {
    const upper = text.toUpperCase();
    return upper.includes('BANCO INTER') || upper.includes('INTER S/A') || upper.includes('INTER S.A.');
  }

  parse(text: string): ExtractedInvoiceResult {
    const bankName = 'Banco Inter';
    let brand = 'Mastercard';
    if (text.toUpperCase().includes('VISA')) brand = 'Visa';

    // Mês de Referência (Mês de consumo anterior ao Vencimento)
    let monthReferenced = new Date().toISOString().slice(0, 7);
    const dateMatch =
      text.match(/Data de Vencimento\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/VENCIMENTO\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/(\d{2})\/(\d{2})\/(\d{4})/);

    if (dateMatch && dateMatch[3] && dateMatch[3].length === 4) {
      const year = parseInt(dateMatch[3], 10);
      const month = parseInt(dateMatch[2], 10);
      monthReferenced = getPreviousMonthReference(year, month);
    }

    // Mapa de itens agrupados por cartão (dígitos finais)
    const cardItemsMap: Record<string, ExtractedInvoiceItem[]> = {};

    let currentCardLast4 = '0000';
    const mainCardMatch = text.match(/(?:CARTÃO\s*)?\d{4}\*{4}(\d{4})/i);
    if (mainCardMatch) {
      currentCardLast4 = mainCardMatch[1];
    }
    cardItemsMap[currentCardLast4] = [];

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        !line ||
        line.includes('PAGTO') ||
        line.includes('PAGAMENTO') ||
        line.includes('DEBITO AUTOMATICO') ||
        line.includes('DÉBITO AUTOMÁTICO') ||
        line.includes('Total') ||
        line.includes('Subtotal')
      ) continue;

      // Verificar se a linha indica transição para outro cartão ex: "CARTÃO 5364****4899"
      const sectionCardMatch = line.match(/(?:CARTÃO\s*)?\d{4}\*{4}(\d{4})/i);
      if (sectionCardMatch) {
        currentCardLast4 = sectionCardMatch[1];
        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }
      }

      // Pattern Inter: 10 de abr. 2026DIGITALSIGN *26094448 (Parcela 01 de 06)-R$ 22,70
      const match = line.match(/^(\d{2}\s*de\s*[a-z]{3}\.\s*\d{4})\s*(.*?)(?:\s*\((?:Parcela\s*)?(\d{1,2})\s*de\s*(\d{1,2})\))?\s*[-−–—+]?\s*R\$\s*([\d\.]+\,\d{2})$/i);

      if (match) {
        const dateStr = match[1];
        let desc = match[2].trim();
        const currentInst = match[3] ? parseInt(match[3], 10) : 1;
        const totalInst = match[4] ? parseInt(match[4], 10) : 1;
        const amountStr = match[5].replace(/\./g, '').replace(',', '.');
        let amount = parseFloat(amountStr);

        if (isNaN(amount) || amount === 0) continue;

        // No Banco Inter, valores de compras são normais (positivos). Créditos têm o sinal '+' ou palavras-chave de estorno/cashback.
        const isCredit =
          /\+\s*R\$/i.test(line) ||
          /\+\s*[\d\.]+\,\d{2}/.test(line) ||
          line.includes(' +') ||
          /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(desc);

        if (isCredit) {
          amount = -Math.abs(amount);
        } else {
          amount = Math.abs(amount);
        }

        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }

        cardItemsMap[currentCardLast4].push({
          description: desc || 'Compra Inter',
          amount,
          currentInstallment: currentInst,
          totalInstallments: totalInst,
          purchaseDate: dateStr,
          cardLast4: currentCardLast4,
          itemType: isCredit
            ? 'CREDIT'
            : /SEGURO|PROTEÇÃO|PROTECAO/i.test(desc)
              ? 'FEE'
              : undefined,
        });
      }
    }

    // Estruturar lista de cartões encontrados no PDF
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
