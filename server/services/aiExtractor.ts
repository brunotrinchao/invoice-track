import { GoogleGenerativeAI } from '@google/generative-ai';
import pdfParse from 'pdf-parse';
import { ExtractedInvoiceResult, ParsedCardTransactions } from './parsers/InvoiceParserInterface.js';

export async function extractWithAI(pdfBuffer: Buffer, apiKey?: string, password?: string): Promise<ExtractedInvoiceResult | null> {
  const key = apiKey || process.env.GEMINI_API_KEY;
  if (!key) {
    console.log('[AI Extractor] Nenhuma chave de API fornecida. Acionando Fallback Regex.');
    return null;
  }

  try {
    const options: any = {};
    if (password) {
      options.password = password;
    }
    const parsedPdf = await pdfParse(pdfBuffer, options);
    const text = parsedPdf.text || '';
    if (!text || text.trim().length === 0) {
      return null;
    }

    const genAI = new GoogleGenerativeAI(key);
    let model;
    try {
      model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
    } catch {
      model = genAI.getGenerativeModel({
        model: 'gemini-2.0-flash',
        generationConfig: { responseMimeType: 'application/json' },
      });
    }

    const prompt = `Você é um leitor especialista em faturas de cartão de crédito brasileiras.
Analise o texto da fatura a seguir e extraia as informações estruturadas em JSON estrito.
ATENÇÃO: Uma única fatura PDF pode conter mais de um cartão de crédito (ex: cartão principal + cartões adicionais). Agrupe as compras por cartão.

GUIA DE PARTICULARIDADES POR BANCO E EMISSOR:

1. MERCADO PAGO / MERCADO LIVRE:
   - Cartões são rotulados com mascaramento ex: Cartão Visa [************4422] ou [************2207].
   - Extraia os 4 últimos dígitos ("4422", "2207"). NUNCA crie cartões falsos para anos (ex: '2025', '2026') ou 'Fatu' / 'Resumo'.
   - Cada cartão possui seu total próprio impresso no PDF (ex: Total R$ 2.035,71). O "totalAmount" deve ser o total declarado da seção daquele cartão.
   - Padrões de compras: "DD/MM | DESCRICAO | Parcela X de Y | R$ XX,XX" ou "DD/MM DESCRICAO X/Y R$ XX,XX".
   - Nomes de lojas costumam iniciar com "MP *", "ML *", "PAG*", "MERCADOLIVRE". Mantenha a descrição limpa.

2. NUBANK (NU PAGAMENTOS):
   - Lançamentos sob a seção "Fatura Atual" ou "Lançamentos".
   - Parcelas formatadas como "01/10" ou "PARCELA 1 DE 10" ou "(1/10)".
   - "Pagamento recebido" ou "Pagamento de fatura" não são compras (são pagamentos/créditos da fatura anterior).

3. ITAÚ / ITAÚCARD:
   - Seções separadas por nome de titular e "•••• XXXX".
   - Parcelas formatadas como "PARC 02/06" ou "PARCELA 02 DE 06".
   - IOF internacional pode vir em linha própria ("IOF COMPRA INTERNACIONAL").

4. BRADESCO / BRADESCARD:
   - Identificados por "Cartão XXXX.XXXX.XXXX.1234".
   - Totais marcados como "TOTAL DO CARTÃO R$ ...".
   - Parcelas formatadas como "PARC 03/12" ou "03/12".

5. SANTANDER:
   - Agrupado por "Cartão Final 1234".
   - Parcelas "PARC 02/10" ou "02 DE 10".

6. BANCO INTER:
   - Lançamentos com data DD/MM/YYYY ou DD/MM.
   - Parcelas "PARCELA 02/05" ou "02/05".
   - ATENÇÃO: O hífen '-' na coluna Beneficiário do Inter é um separador padrão, NUNCA considere como crédito.
   - No Banco Inter, compras normais são valores positivos. Somente lançamentos com o sinal '+' antes do valor (ou palavras como Cashback, Estorno, Reembolso) são créditos (valor negativo).

7. C6 BANK:
   - Organizado por titular "•••• 1234".
   - Parcelas "PARCELA 01 DE 03" ou "01/03".

8. XP BANK / XP INVESTIMENTOS:
   - Indicados com "•••• 1234". Créditos de Investback podem vir associados.

9. PICPAY:
   - Seção "Transações com o Cartão PicPay".
   - Parcelas "PARCELA 01/02" ou "01 DE 02".

10. BTG PACTUAL:
    - Indicados com "•••• 1234". Subtotais por titular.

REGRAS ESTREITAS DE EXTRAÇÃO:
- "monthReferenced": Mês de referência em formato YYYY-MM correspondente ao mês de consumo da fatura (mês anterior ao vencimento). Exemplo: se a data de vencimento for em Setembro (10/09/2026), a fatura é do mês de Agosto e o "monthReferenced" DEVE SER "2026-08". Se o vencimento foi 17/08/2026 (Agosto), a fatura é de Julho e o "monthReferenced" DEVE SER "2026-07". Se o vencimento foi 10/01/2026 (Janeiro), o "monthReferenced" DEVE SER "2025-12".
- "totalAmount": total declarado da seção do cartão no PDF.
- "currentInstallment" e "totalInstallments": se for parcela ex 3/5, use 3 e 5. Se à vista, use 1 e 1.
- ITENS DE CRÉDITO, ESTORNOS, REEMBOLSOS E DESCONTOS:
  Extraia TODOS os itens de crédito/estorno/reembolso/desconto/ajuste a crédito do cartão.
  Se o lançamento for um crédito (ex: "Crédito concedido", "Estorno", "Reembolso", "Desconto", "Cashback", "Devolução" ou com sinal "-R$"), coloque "amount" como NÚMERO NEGATIVO (ex: -30.28).
- EXTRAÇÃO DE TARIFAS, MULTAS, JUROS, IOF E SEGUROS:
  Extraia OBRIGATORIAMENTE todas as tarifas, juros de mora/rotativo, multas por atraso, IOF, anuidades, seguros e encargos cobrados na fatura como itens (com amount positivo), associando ao cartão do cliente.
- MERCADO PAGO: a seção "Movimentações na fatura" contém taxas, multas, juros e créditos concedidos (ex: "IOF do rotativo", "Juros do rotativo", "Multa por atraso", "Juros de mora", "Crédito concedido"). Extraia TODOS esses lançamentos como items do cartão principal (créditos com amount negativo). NUNCA os omita.
- "declaredInvoiceTotal": total a pagar do boleto/fatura (ex: "Total a pagar R$ 1.987,88" -> 1987.88). Devolva como número. Se não encontrar, use null.
- NUNCA inclua como item: "PAGTO DEBITO AUTOMATICO", "PAGAMENTO DE FATURA", "PAGAMENTO DA FATURA", "PAGTO DEBITO", "DÉBITO AUTOMÁTICO" ou qualquer lançamento de pagamento/liquidação da fatura anterior. Esses são pagamentos, não compras nem créditos — OMITA-OS completamente.
- NUNCA crie cartões falsos para anos (ex: '2025') ou resumos do boleto.

Retorne EXATAMENTE este objeto JSON:
{
  "monthReferenced": "YYYY-MM",
  "declaredInvoiceTotal": 0.0,
  "cards": [
    {
      "bankName": "Mercado Pago | Nubank | Itaú | Bradesco | Santander | Banco Inter | C6 Bank | XP Bank | PicPay | BTG Pactual | Cartão de Crédito",
      "brand": "Mastercard | Visa | Elo | Amex",
      "last4Digits": "4321",
      "totalAmount": 0.0,
      "items": [
        {
          "description": "Nome do estabelecimento / produto",
          "amount": 0.0,
          "currentInstallment": 1,
          "totalInstallments": 1
        }
      ]
    }
  ]
}

Texto da Fatura:
---
${text.slice(0, 15000)}
---`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const parsedJson = JSON.parse(responseText);

    if (parsedJson && Array.isArray(parsedJson.cards)) {
      let processedCards: ParsedCardTransactions[] = parsedJson.cards.map((c: any) => ({
        bankName: c.bankName || 'Cartão de Crédito',
        brand: c.brand || 'Mastercard',
        last4Digits: String(c.last4Digits || '0000').slice(-4),
        totalAmount: parseFloat(c.totalAmount) || 0,
        items: Array.isArray(c.items)
          ? c.items
              .filter((item: any) => {
                const d = String(item.description || '').toUpperCase();
                return !(
                  d.includes('PAGTO DEBITO') ||
                  d.includes('PAGAMENTO DE FATURA') ||
                  d.includes('PAGAMENTO DA FATURA') ||
                  d.includes('PAGTO DEBITO AUTOMATICO') ||
                  d.includes('DÉBITO AUTOMÁTICO') ||
                  d.includes('DEBITO AUTOMATICO')
                );
              })
              .map((item: any) => {
              const rawAmt = parseFloat(item.amount);
              const descStr = String(item.description || 'Item').slice(0, 80);
              const isCredit = /ESTORNO|REEMBOLSO|CASHBACK|CRÉDITO|CREDITO|DESCONTO|DEVOLUC|DEVOLUÇ|INVESTBACK|AJUSTE/i.test(descStr);
              let finalAmount = isNaN(rawAmt) ? 0 : rawAmt;
              if (isCredit && finalAmount > 0) {
                finalAmount = -Math.abs(finalAmount);
              }
              return {
                description: descStr,
                amount: finalAmount,
                currentInstallment: parseInt(item.currentInstallment) || 1,
                totalInstallments: parseInt(item.totalInstallments) || 1,
              };
            })
          : [],
      }));

      // Consolidar cartões sintéticos (ex: 'Fatu' ou 'Resumo') no cartão principal real
      const realCards = processedCards.filter((c) => c.last4Digits !== 'Fatu' && c.brand !== 'Resumo');
      const syntheticCards = processedCards.filter((c) => c.last4Digits === 'Fatu' || c.brand === 'Resumo');

      if (syntheticCards.length > 0 && realCards.length > 0) {
        let mainCard = realCards[0];
        for (const card of realCards) {
          if (card.totalAmount > mainCard.totalAmount) {
            mainCard = card;
          }
        }
        for (const synCard of syntheticCards) {
          for (const item of synCard.items) {
            mainCard.items.push({
              ...item,
              cardLast4: mainCard.last4Digits,
            });
            mainCard.totalAmount = Math.round((mainCard.totalAmount + item.amount) * 100) / 100;
          }
        }
        processedCards = realCards;
      }

      return {
        monthReferenced: parsedJson.monthReferenced || new Date().toISOString().slice(0, 7),
        cards: processedCards,
        extractedBy: 'ai',
        declaredInvoiceTotal: parsedJson.declaredInvoiceTotal ? Number(parsedJson.declaredInvoiceTotal) : undefined,
      };
    }
  } catch (error: any) {
    const errMsg = (error.message || error.toString() || '').toLowerCase();
    if (
      errMsg.includes('password') ||
      errMsg.includes('encrypted') ||
      errMsg.includes('protected') ||
      errMsg.includes('incorrect password') ||
      error.name === 'PasswordException'
    ) {
      throw error;
    }
    console.warn('[AI Extractor Warning] Falha na chamada da IA:', error);
  }

  return null;
}
