import { ExtractedInvoiceItem, ParsedCardTransactions } from '../services/parsers/InvoiceParserInterface.js';

export function parseMercadoPagoText(text: string) {
  const bankName = 'Mercado Pago';
  let brand = 'Visa';
  if (text.toUpperCase().includes('MASTERCARD')) {
    brand = 'Mastercard';
  }

  // Mês de Referência (Vencimento) ex: "Vencimento: 17/08/2026"
  let monthReferenced = new Date().toISOString().slice(0, 7);
  const dateMatch =
    text.match(/Vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/Vencimento\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
    text.match(/(\d{2})\/(\d{2})\/(\d{4})/);

  if (dateMatch && dateMatch[3] && dateMatch[3].length === 4) {
    monthReferenced = `${dateMatch[3]}-${dateMatch[2]}`;
  }

  // Valor Total a Pagar do Boleto (ex: R$ 1.987,88)
  let declaredInvoiceTotal = 0;
  const totalMatch =
    text.match(/Total a pagar\s*R\$\s*([\d\.]+\,\d{2})/i) ||
    text.match(/Essa é sua fatura de [a-z]+\s*Total a pagar\s*R\$\s*([\d\.]+\,\d{2})/i) ||
    text.match(/Total da fatura\s*R\$\s*([\d\.]+\,\d{2})/i) ||
    text.match(/Valor a pagar\s*R\$\s*([\d\.]+\,\d{2})/i);

  if (totalMatch) {
    const valStr = totalMatch[1].replace(/\./g, '').replace(',', '.');
    declaredInvoiceTotal = parseFloat(valStr);
  }

  // Localizar todas as seções de cartões que contêm asteriscos de mascaramento [************4422]
  const cardHeaderRegex = /(?:Cartão\s+.*?)?\[\s*\*+(\d{4})\s*\]/gi;
  const matches = Array.from(text.matchAll(cardHeaderRegex));

  const sections: { last4: string; start: number; end: number }[] = [];

  for (let k = 0; k < matches.length; k++) {
    const m = matches[k];
    const last4 = m[1];
    const start = m.index! + m[0].length;
    const end = k < matches.length - 1 ? matches[k + 1].index! : text.length;
    sections.push({ last4, start, end });
  }

  const cardsMap: Record<string, ExtractedInvoiceItem[]> = {};
  const cardDeclaredTotals: Record<string, number> = {};

  if (sections.length > 0) {
    for (const sec of sections) {
      const sectionText = text.slice(sec.start, sec.end);
      const items = extractItemsFromSectionText(sectionText, sec.last4);
      cardsMap[sec.last4] = items;

      // Capturar o total da seção ex: Total R$ 2.035,71
      const secTotMatch = sectionText.match(/Total\s*(?:do\s+cartão)?\s*R\$\s*([\d\.]+\,\d{2})/i);
      if (secTotMatch) {
        cardDeclaredTotals[sec.last4] = parseFloat(secTotMatch[1].replace(/\./g, '').replace(',', '.'));
      }
    }
  } else {
    // Fallback se não houver colchetes com asteriscos: usa o texto inteiro sob o último4 padrão ou 0000
    const fallbackLast4 = '4422';
    cardsMap[fallbackLast4] = extractItemsFromSectionText(text, fallbackLast4);
  }

  const cards: ParsedCardTransactions[] = Object.entries(cardsMap)
    .filter(([_, items]) => items.length > 0)
    .map(([last4, items]) => {
      const calculatedTotal = items.reduce((sum, item) => sum + item.amount, 0);
      const declaredTotal = cardDeclaredTotals[last4] || Math.round(calculatedTotal * 100) / 100;
      return {
        bankName,
        brand,
        last4Digits: last4,
        totalAmount: Math.round(declaredTotal * 100) / 100,
        items,
      };
    });

  return {
    monthReferenced,
    cards,
    extractedBy: 'regex',
  };
}

function extractItemsFromSectionText(sectionText: string, cardLast4: string): ExtractedInvoiceItem[] {
  const items: ExtractedInvoiceItem[] = [];

  // Substituir quebras de linha por espaço e remover caracteres de pipe
  const normalized = sectionText.replace(/\|/g, ' ').replace(/\s+/g, ' ');

  // Expressão regular global para encontrar ocorrências de lançamentos:
  // Data (DD/MM) + Descrição + Parcela Opcional + R$ Valor
  const itemRegex = /(\d{2}\/\d{2})\s+(.+?)(?:\s+(?:Parcela\s*(\d{1,2})\s*de\s*(\d{1,2})|(\d{1,2})\/(\d{1,2})|\((\d{1,2})\/(\d{1,2})\)))?\s+R\$\s*([\d\.]+\,\d{2})/gi;

  let match;
  while ((match = itemRegex.exec(normalized)) !== null) {
    const dateStr = match[1];
    let desc = match[2].trim();
    const currentInst = parseInt(match[3] || match[5] || match[7] || '1', 10);
    const totalInst = parseInt(match[4] || match[6] || match[8] || '1', 10);
    const amountStr = match[9].replace(/\./g, '').replace(',', '.');
    const amount = parseFloat(amountStr);

    const upperDesc = desc.toUpperCase();
    if (
      !isNaN(amount) &&
      amount > 0 &&
      !upperDesc.includes('PAGAMENTO DA FATURA') &&
      !upperDesc.includes('CRÉDITO CONCEDIDO') &&
      !upperDesc.includes('TOTAL R$') &&
      !upperDesc.includes('SALDO ANTERIOR')
    ) {
      items.push({
        description: desc || 'Compra Mercado Pago',
        amount,
        currentInstallment: currentInst,
        totalInstallments: totalInst,
        purchaseDate: dateStr,
        cardLast4,
      });
    }
  }

  return items;
}
