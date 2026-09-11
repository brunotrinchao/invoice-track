import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class BradescoInvoiceParser implements InvoiceParserStrategy {
  name = 'Bradesco';

  canParse(text: string): boolean {
    const upper = text.toUpperCase();
    return upper.includes('BRADESCO') || upper.includes('BANCO BRADESCO');
  }

  parse(text: string): ExtractedInvoiceResult {
    const bankName = 'Bradesco';
    let brand = 'Visa';
    const upperText = text.toUpperCase();
    if (upperText.includes('MASTERCARD')) brand = 'Mastercard';
    else if (upperText.includes('ELO')) brand = 'Elo';
    else if (upperText.includes('AMEX') || upperText.includes('AMERICAN EXPRESS')) brand = 'Amex';

    // Mês de Referência (Mês de consumo anterior ao Vencimento, ex: Vencimento "25/08/2026" -> Referência "2026-07")
    let monthReferenced = new Date().toISOString().slice(0, 7);
    const dateMatch =
      text.match(/Vencimento\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/(\d{2})\/(\d{2})\/(\d{4})/);

    if (dateMatch && dateMatch[3] && dateMatch[3].length === 4) {
      const year = parseInt(dateMatch[3], 10);
      const month = parseInt(dateMatch[2], 10);
      monthReferenced = getPreviousMonthReference(year, month);
    }

    // Identificar o Valor Total a Pagar do Boleto da Fatura (ex: R$ 4.149,52)
    let declaredInvoiceTotal = 0;
    const totalMatch =
      text.match(/Total da fatura\s*R\$\s*([\d\.]+\,\d{2})/i) ||
      text.match(/Total da fatura[\r\n\s]*R\$\s*([\d\.]+\,\d{2})/i) ||
      text.match(/Pagamento total\s*R\$\s*([\d\.]+\,\d{2})/i) ||
      text.match(/Valor total a pagar:\s*R\$\s*([\d\.]+\,\d{2})/i);

    if (totalMatch) {
      const valStr = totalMatch[1].replace(/\./g, '').replace(',', '.');
      declaredInvoiceTotal = parseFloat(valStr);
    }

    const cardItemsMap: Record<string, ExtractedInvoiceItem[]> = {};
    let currentCardLast4 = '0000';
    let bufferLine = '';

    const lines = text.split(/\r?\n/);

    const processBuffer = (line: string, card: string) => {
      if (line.includes('PAGTO.') || line.includes('Previsão de fechamento') || line.includes('ComprasR$')) return;

      // Match date at start (dd/mm)
      const dateMatch = line.match(/^(\d{2}\/\d{2})\s+(.*)$/);
      if (!dateMatch) return;

      const dateStr = dateMatch[1];
      let rest = dateMatch[2].trim();

      // Check trailing minus or credit sign
      const hasMinus = /[\-\−]\s*$/.test(rest) || rest.endsWith('-') || rest.endsWith('−');
      if (hasMinus) {
        rest = rest.replace(/[\-\−]\s*$/, '').trim();
      }

      // Extract amount from end of rest (ex: 64,78 or 1.275,00)
      const amountMatch = rest.match(/([\d\.]+\,\d{2})$/);
      if (!amountMatch) return;

      const rawAmountStr = amountMatch[1];
      let amount = parseFloat(rawAmountStr.replace(/\./g, '').replace(',', '.'));
      if (isNaN(amount) || amount === 0) return;

      // Remove amount from rest
      let descAndDetails = rest.substring(0, rest.length - rawAmountStr.length).trim();

      // Check installment ex: 01/02 or 08/09
      let currentInst = 1;
      let totalInst = 1;
      const instMatch = descAndDetails.match(/(\d{2})\/(\d{2})/);
      if (instMatch) {
        currentInst = parseInt(instMatch[1], 10);
        totalInst = parseInt(instMatch[2], 10);
        const instIndex = descAndDetails.indexOf(instMatch[0]);
        descAndDetails = descAndDetails.substring(0, instIndex).trim();
      }

      const isCredit = hasMinus || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(descAndDetails);
      if (isCredit) {
        amount = -Math.abs(amount);
      } else {
        amount = Math.abs(amount);
      }

      if (!cardItemsMap[card]) cardItemsMap[card] = [];

      cardItemsMap[card].push({
        description: descAndDetails || 'Compra Bradesco',
        amount,
        currentInstallment: currentInst,
        totalInstallments: totalInst,
        purchaseDate: dateStr,
        cardLast4: card,
      });
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i].trim();
      if (!rawLine) continue;

      // Troca de cartão ex: "Cartão 4066 XXXX XXXX 7932" ou "Nome: ... Cartão: 4066 XXXX XXXX 7932"
      const cardMatch = rawLine.match(/Cartão\s+.*(\d{4})$/i);
      if (cardMatch) {
        if (bufferLine) {
          processBuffer(bufferLine, currentCardLast4);
          bufferLine = '';
        }
        currentCardLast4 = cardMatch[1];
        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }
        continue;
      }

      if (rawLine.includes('PAGTO.') || rawLine.includes('Total para') || rawLine.includes('Total da fatura')) {
        if (bufferLine) {
          processBuffer(bufferLine, currentCardLast4);
          bufferLine = '';
        }
        continue;
      }

      if (/^\d{2}\/\d{2}\b/.test(rawLine)) {
        if (bufferLine) {
          processBuffer(bufferLine, currentCardLast4);
        }
        bufferLine = rawLine;
      } else if (bufferLine) {
        bufferLine += ' ' + rawLine;
      }

      if (bufferLine && /[\d\.]+\,\d{2}\-?$/.test(bufferLine)) {
        const nextLine = (lines[i + 1] || '').trim();
        if (nextLine === '-' || nextLine === '−') {
          bufferLine += ' -';
          i++;
        }
        processBuffer(bufferLine, currentCardLast4);
        bufferLine = '';
      }
    }

    if (bufferLine) {
      processBuffer(bufferLine, currentCardLast4);
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
      declaredInvoiceTotal,
    };
  }
}
