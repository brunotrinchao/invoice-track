import { InvoiceParserStrategy, ExtractedInvoiceResult, ParsedCardTransactions, ExtractedInvoiceItem, getPreviousMonthReference } from './InvoiceParserInterface.js';

export class MercadoPagoInvoiceParser implements InvoiceParserStrategy {
  name = 'Mercado Pago';

  canParse(text: string): boolean {
    const upper = text.toUpperCase();
    return (
      upper.includes('MERCADO PAGO') ||
      upper.includes('MERCADOPAGO') ||
      upper.includes('MERCADO PAGO BRASIL') ||
      upper.includes('MERCADO LIVRE') ||
      upper.includes('MERCADOLIVRE') ||
      upper.includes('MERCADO CRÉDITO') ||
      upper.includes('MERCADOCREDITO') ||
      upper.includes('MPALETAONLINE') ||
      upper.includes('MP MELIMAIS')
    );
  }

  parse(text: string): ExtractedInvoiceResult {
    const bankName = 'Mercado Pago';
    let brand = 'Visa';
    if (text.toUpperCase().includes('MASTERCARD')) {
      brand = 'Mastercard';
    }

    // Mês de Referência (Mês de consumo anterior ao Vencimento, ex: Vencimento "17/08/2026" -> Referência "2026-07")
    let monthReferenced = new Date().toISOString().slice(0, 7);
    let dueDate: string | undefined = undefined;
    const dateMatch =
      text.match(/Vencimento:\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/Vencimento\s*(\d{2})\/(\d{2})\/(\d{4})/i) ||
      text.match(/(\d{2})\/(\d{2})\/(\d{4})/);

    if (dateMatch && dateMatch[3] && dateMatch[3].length === 4) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const year = parseInt(dateMatch[3], 10);
      monthReferenced = getPreviousMonthReference(year, month);
      dueDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }

    // Identificar o Valor Total a Pagar do Boleto da Fatura (ex: R$ 1.987,88)
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

    // Identificar o cartão principal (ex: 4422)
    const cardMatchFirst = text.match(/(?:Cartão|Cartao|Visa|Mastercard|Elo|Amex|final)\s+[^0-9\n]*?\[?\s*[\*\u2022xX]*\s*(\d{4})\s*\]?/i);
    const primaryLast4 = cardMatchFirst && !['2024', '2025', '2026', '2027'].includes(cardMatchFirst[1]) ? cardMatchFirst[1] : '4422';

    const lines = text.split('\n');
    const cardsMap: Record<string, ExtractedInvoiceItem[]> = {};
    const cardDeclaredTotals: Record<string, number> = {};
    const invoiceStatementItems: ExtractedInvoiceItem[] = [];

    let currentCardLast4: string | null = null;
    let sectionState: 'FATURA_GERAL' | 'CARD' | 'OTHER' = 'FATURA_GERAL';

    const cardHeaderRegex = /(?:Cartão|Cartao|Visa|Mastercard|Elo|Amex|final)\s+[^0-9\n]*?\[?\s*[\*\u2022xX]*\s*(\d{4})\s*\]?/i;

    const nonCardHeaders = [
      'PARCELE A FATURA',
      'SEU CARTÃO DE CRÉDITO',
      'INFORMAÇÕES COMPLEMENTARES',
      'OPÇÕES DE PAGAMENTO',
      'COMPRAS INTERNACIONAIS',
      'DECLARAÇÃO ANUAL',
      'FALE COM A GENTE',
      'LANÇAMENTOS FUTUROS',
      'PAGUE SUA FATURA'
    ];

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;
      const upperLine = line.toUpperCase();

      // Seção de movimentações gerais da fatura (créditos concedidos / encargos)
      if (upperLine.includes('MOVIMENTAÇÕES NA FATURA') || upperLine.includes('MOVIMENTACOES NA FATURA')) {
        sectionState = 'FATURA_GERAL';
        currentCardLast4 = null;
        continue;
      }

      // Verificar se a linha introduz um cartão
      const cardMatch = line.match(cardHeaderRegex);
      if (cardMatch) {
        const last4 = cardMatch[1];
        if (last4 && !['2024', '2025', '2026', '2027'].includes(last4)) {
          sectionState = 'CARD';
          currentCardLast4 = last4;
          if (!cardsMap[currentCardLast4]) {
            cardsMap[currentCardLast4] = [];
          }
          continue;
        }
      }

      // Verificar se mudou para uma seção que não é cartão nem movimentações da fatura
      if (nonCardHeaders.some(h => upperLine.includes(h))) {
        sectionState = 'OTHER';
        currentCardLast4 = null;
        continue;
      }

      // Processar lançamentos
      if (sectionState === 'CARD' && currentCardLast4) {
        // Total declarado do cartão ex: TotalR$ 2.035,71 ou Total R$ 2.035,71
        const totalCardMatch = line.match(/^Total\s*R\$\s*([\d\.]+\,\d{2})$/i);
        if (totalCardMatch) {
          const cardTot = parseFloat(totalCardMatch[1].replace(/\./g, '').replace(',', '.'));
          cardDeclaredTotals[currentCardLast4] = cardTot;
          continue;
        }
      }

      if (sectionState === 'CARD' || sectionState === 'FATURA_GERAL') {
        // Casamento de item com data: DD/MM Descrição [Parcela X de Y] R$ Valor
        let itemMatch = line.match(/^(\d{2}\/\d{2})(.+?)R\$\s*(-?\s*[\d\.]+\,\d{2})$/i);
        let dateStr = '01/01';
        let rawDesc = '';
        let rawAmountStr = '';

        if (itemMatch) {
          dateStr = itemMatch[1];
          rawDesc = itemMatch[2].trim();
          rawAmountStr = itemMatch[3];
        } else {
          // Casamento de tarifas, multas, juros, IOF e seguros sem prefixo de data
          const feeMatch = line.match(/^(MULTA|JUROS|IOF|ENCARGOS|TARIFA|ANUIDADE|TAXA|SEGURO|PROTEÇÃO|PROTECAO|MORA)(.+?)R\$\s*(-?\s*[\d\.]+\,\d{2})$/i);
          if (feeMatch) {
            rawDesc = (feeMatch[1] + feeMatch[2]).trim();
            rawAmountStr = feeMatch[3];
            itemMatch = feeMatch as any;
          }
        }

        if (itemMatch) {
          const amountStr = rawAmountStr.replace(/\s+/g, '').replace(/\./g, '').replace(',', '.');
          let amount = parseFloat(amountStr);

          if (isNaN(amount) || amount === 0) continue;

          // Verificar parcelamento
          let currentInst = 1;
          let totalInst = 1;
          const instMatch = rawDesc.match(/(?:Parcela|Parc\.?)\s*(\d{1,2})\s*de\s*(\d{1,2})|\b(\d{1,2})\/(\d{1,2})\b|\((\d{1,2})\/(\d{1,2})\)/i);
          if (instMatch) {
            currentInst = parseInt(instMatch[1] || instMatch[3] || instMatch[5], 10);
            totalInst = parseInt(instMatch[2] || instMatch[4] || instMatch[6], 10);
            rawDesc = rawDesc.replace(instMatch[0], '').trim();
          }

          const desc = rawDesc.replace(/^[\s\|]+|[\s\|]+$/g, '').trim();

          const isCredit =
            rawAmountStr.includes('-') ||
            /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE|PAGAMENTO/i.test(desc);

          if (isCredit) {
            amount = -Math.abs(amount);
          } else {
            amount = Math.abs(amount);
          }

          if (this.isValidItemDescription(desc)) {
            // Ignorar pagamento da fatura anterior no saldo das compras abertas se for apenas liquidação da fatura passada
            if (desc.toUpperCase().includes('PAGAMENTO DA FATURA DE') || desc.toUpperCase().includes('PAGAMENTO DE FATURA DE')) {
              continue;
            }

            const itemObj: ExtractedInvoiceItem = {
              description: desc,
              amount,
              currentInstallment: currentInst,
              totalInstallments: totalInst,
              purchaseDate: dateStr,
              cardLast4: sectionState === 'CARD' ? (currentCardLast4 || primaryLast4 || undefined) : (primaryLast4 || undefined),
              itemType: isCredit
                ? 'CREDIT'
                : /^MULTA/i.test(desc)
                  ? 'FINE'
                  : /^JUROS|MORA/i.test(desc)
                    ? 'INTEREST'
                    : /^IOF|IMPOSTO/i.test(desc)
                      ? 'TAX'
                      : /^TARIFA|ANUIDADE|TAXA|SEGURO|PROTEÇÃO|PROTECAO|ENCARGOS|ENCARGO/i.test(desc)
                        ? 'FEE'
                        : undefined,
            };

            if (sectionState === 'CARD' && currentCardLast4) {
              cardsMap[currentCardLast4].push(itemObj);
            } else {
              invoiceStatementItems.push(itemObj);
            }
          }
        }
      }
    }

    // Se houver itens de movimentação geral da fatura (taxas/créditos concedidos), anexá-los ao cartão principal para visualização no modal
    if (invoiceStatementItems.length > 0) {
      if (!cardsMap[primaryLast4]) {
        cardsMap[primaryLast4] = [];
      }
      cardsMap[primaryLast4].push(...invoiceStatementItems);
    }

    const cards: ParsedCardTransactions[] = Object.entries(cardsMap)
      .filter(([_, items]) => items.length > 0)
      .map(([last4, items]) => {
        // totalAmount = soma REAL dos itens (compras + taxas + créditos),
        // garantindo consistência com o que será salvo no MySQL.
        const calculatedTotal = items.reduce((sum, item) => sum + item.amount, 0);
        // Total declarado no PDF ("Total R$ X") serve apenas como fallback
        // quando nenhum item foi parseado — nunca como override da soma real.
        const declaredTotal = cardDeclaredTotals[last4];
        const totalAmount =
          calculatedTotal !== 0
            ? Math.round(calculatedTotal * 100) / 100
            : Math.round((declaredTotal || 0) * 100) / 100;
        return {
          bankName,
          brand,
          last4Digits: last4,
          totalAmount,
          items,
        };
      });

    return {
      monthReferenced,
      dueDate,
      cards,
      extractedBy: 'regex',
      declaredInvoiceTotal,
    };
  }

  private isValidItemDescription(desc: string): boolean {
    if (!desc || desc.length < 2) return false;
    const upper = desc.toUpperCase();

    return (
      !upper.includes('FATURA') &&
      !upper.includes('ESSA É SUA FATURA') &&
      !upper.includes('TOTAL') &&
      !upper.includes('TOTAL A PAGAR') &&
      !upper.includes('TOTAL DA FATURA') &&
      !upper.includes('TOTAL DO CARTÃO') &&
      !upper.includes('VALOR A PAGAR') &&
      !upper.includes('VENCIMENTO') &&
      !upper.includes('DATAMOVIMENTAÇÕES') &&
      !upper.includes('DATAMOVIMENTACOES') &&
      !upper.includes('PAGAMENTO DA FATURA') &&
      !upper.includes('PAGAMENTO DE FATURA')
    );
  }
}



