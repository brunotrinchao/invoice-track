import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class PicPayInvoiceParser implements InvoiceParserStrategy {
  name = 'PicPay';

  canParse(text: string): boolean {
    const upper = text.toUpperCase();
    return upper.includes('PICPAY') || upper.includes('PICPAY CARD');
  }

  parse(text: string): ExtractedInvoiceResult {
    const bankName = 'PicPay';
    let brand = 'Mastercard';
    if (text.toUpperCase().includes('VISA')) brand = 'Visa';

    // Mês de Referência e Data de Vencimento
    let monthReferenced = new Date().toISOString().slice(0, 7);
    let dueDate: string | undefined = undefined;
    const dateMatch =
      text.match(/Vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/(\d{2})\/(\d{2})\/(\d{4})\s*\|\s*Fechamento/i) ||
      text.match(/15\/(\d{2})\/(\d{4})\s*\|\s*09\/\d{2}\/\d{4}/) ||
      text.match(/(\d{2})\/(\d{2})\/(\d{4})/);

    if (dateMatch) {
      let day = 15;
      let month = 0;
      let year = 0;

      if (dateMatch[1] && dateMatch[2] && dateMatch[3] && dateMatch[3].length === 4) {
        day = parseInt(dateMatch[1], 10);
        month = parseInt(dateMatch[2], 10);
        year = parseInt(dateMatch[3], 10);
      } else if (dateMatch[2] && dateMatch[2].length === 4) {
        month = parseInt(dateMatch[1], 10);
        year = parseInt(dateMatch[2], 10);
      }

      if (year && month) {
        monthReferenced = getPreviousMonthReference(year, month);
        const dayStr = String(day).padStart(2, '0');
        const monthStr = String(month).padStart(2, '0');
        dueDate = `${year}-${monthStr}-${dayStr}`;
      }
    }

    const cardItemsMap: Record<string, ExtractedInvoiceItem[]> = {};

    // Tenta encontrar o cartão principal no PDF para evitar deixar como '0000'
    let currentCardLast4 = '0000';
    const mainCardMatch = text.match(/final\s+(\d{4})/i) || text.match(/Picpay Card (?:final )?(\d{4})/i);
    if (mainCardMatch) {
      currentCardLast4 = mainCardMatch[1];
    }
    cardItemsMap[currentCardLast4] = [];

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const upperLine = line.toUpperCase();

      // Ignorar pagamentos de fatura anterior, créditos, estornos e subtotais
      if (
        upperLine.includes('PAGAMENTO DE FATURA') ||
        upperLine.includes('PAGAMENTO RECEBIDO') ||
        upperLine.includes('PAGAMENTO EFETUADO') ||
        upperLine.includes('PAGTO DE FATURA') ||
        upperLine.includes('SUBTOTAL DOS LANÇAMENTOS') ||
        upperLine.includes('SUBTOTAL DOS LANCAMENTOS') ||
        upperLine.includes('TOTAL GERAL DOS LANÇAMENTOS') ||
        upperLine.includes('TOTAL GERAL DOS LANCAMENTOS')
      ) {
        continue;
      }

      // Troca de seção de cartão no PDF ex: "Picpay Card final 8056" ou "final 8056"
      const sectionCardMatch = line.match(/final\s+(\d{4})/i) || line.match(/Picpay Card (?:final )?(\d{4})/i);
      if (sectionCardMatch) {
        currentCardLast4 = sectionCardMatch[1];
        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }
        continue;
      }

      // Pattern flexível para PicPay:
      // "19/10 50.926.924 TAT PARC 11/12 R$ 766,66" ou "19/1050.926.924 TATPARC11/12766,66"
      const regex = /^(\d{2}\/\d{2})\s*(.+?)(?:PARC\s*(\d{1,2})\/(\d{1,2}))?\s*(?:R\$\s*)?([-−–—+]?\s*[\d\.]+\,\d{2})$/i;
      const match = line.match(regex);

      if (match) {
        const purchaseDate = match[1];
        let desc = match[2].trim();
        const currentInst = match[3] ? parseInt(match[3], 10) : 1;
        const totalInst = match[4] ? parseInt(match[4], 10) : 1;
        const rawAmountStr = match[5];

        const isCredit = rawAmountStr.includes('-') || line.includes('-') || /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(desc);
        const amountStr = rawAmountStr.replace(/[-−–—+]/g, '').replace(/\./g, '').replace(',', '.');
        let amount = parseFloat(amountStr);

        if (isNaN(amount) || amount === 0) continue;

        if (isCredit) {
          amount = -Math.abs(amount);
        } else {
          amount = Math.abs(amount);
        }

        // Limpar prefixos/sufixos de PARC residuais na descrição
        desc = desc.replace(/PARC\s*\d{1,2}\/\d{1,2}/gi, '').trim();

        if (!cardItemsMap[currentCardLast4]) {
          cardItemsMap[currentCardLast4] = [];
        }

        cardItemsMap[currentCardLast4].push({
          description: desc || 'Compra PicPay',
          amount,
          currentInstallment: currentInst,
          totalInstallments: totalInst,
          purchaseDate,
          cardLast4: currentCardLast4,
        });
      }
    }

    // Se houver itens associados a '0000' e existe outro cartão real (ex: '8056'), mescla os itens
    const realCardKeys = Object.keys(cardItemsMap).filter((k) => k !== '0000');
    if (realCardKeys.length === 1 && cardItemsMap['0000'] && cardItemsMap['0000'].length > 0) {
      const realKey = realCardKeys[0];
      cardItemsMap[realKey].push(
        ...cardItemsMap['0000'].map((i) => ({ ...i, cardLast4: realKey }))
      );
      delete cardItemsMap['0000'];
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
      dueDate,
      cards,
      extractedBy: 'regex',
    };
  }
}
