import { Router } from 'express';
import { processInvoiceConfirmation } from '../services/financialEngine.js';

export const confirmRouter = Router();

confirmRouter.post('/', async (req, res) => {
  try {
    const { monthReferenced, cards, bankName, brand, last4Digits, items, overwriteExisting, pdfPassword, declaredInvoiceTotal } = req.body;

    // 1. Validar Mês de Referência
    if (!monthReferenced || typeof monthReferenced !== 'string' || !/^\d{4}-\d{2}$/.test(monthReferenced.trim())) {
      return res.status(400).json({
        error: 'Mês de referência inválido ou ausente. O formato esperado é YYYY-MM (ex: 2026-09).',
        missingField: 'monthReferenced',
      });
    }

    // 2. Determinar se enviou formato multi-cartão (cards) ou formato de cartão único
    const hasCardsArray = Array.isArray(cards) && cards.length > 0;
    const hasSingleCardData = Boolean(bankName && brand && last4Digits && Array.isArray(items));

    if (!hasCardsArray && !hasSingleCardData) {
      const missingDetails: string[] = [];
      if (!cards && (!bankName || !brand || !last4Digits || !items)) {
        if (!cards && !bankName) missingDetails.push('Nome do Banco (bankName)');
        if (!cards && !brand) missingDetails.push('Bandeira do Cartão (brand)');
        if (!cards && !last4Digits) missingDetails.push('Últimos 4 dígitos (last4Digits)');
        if (!cards && !items) missingDetails.push('Lista de compras (items)');
      }
      return res.status(400).json({
        error: `Dados da fatura incompletos. Faltando: ${missingDetails.join(', ') || 'Lista de cartões (cards)'}.`,
        missingFields: missingDetails,
      });
    }

    // 3. Validar cartões individualmente se enviou cards[]
    if (hasCardsArray) {
      for (let idx = 0; idx < cards.length; idx++) {
        const c = cards[idx];
        if (!c.bankName || typeof c.bankName !== 'string') {
          return res.status(400).json({
            error: `O cartão #${idx + 1} está sem o nome da instituição (bankName).`,
            missingField: `cards[${idx}].bankName`,
          });
        }
        if (!c.brand || typeof c.brand !== 'string') {
          return res.status(400).json({
            error: `O cartão ${c.bankName} está sem a bandeira (brand).`,
            missingField: `cards[${idx}].brand`,
          });
        }
        if (!c.last4Digits || typeof c.last4Digits !== 'string' || c.last4Digits.length !== 4) {
          return res.status(400).json({
            error: `O cartão ${c.bankName} está sem os últimos 4 dígitos do cartão (last4Digits).`,
            missingField: `cards[${idx}].last4Digits`,
          });
        }
        // Cartões podem ficar sem items selecionados (ex: só taxas movidas p/ invoiceFees).
        // Exigir apenas que o array exista; itens vazios são permitidos.
        if (!Array.isArray(c.items)) {
          return res.status(400).json({
            error: `O cartão ${c.bankName} (•••• ${c.last4Digits}) não possui lista de itens (items).`,
            missingField: `cards[${idx}].items`,
          });
        }

        for (let itemIdx = 0; itemIdx < c.items.length; itemIdx++) {
          const item = c.items[itemIdx];
          const amount = item.amount ?? item.originalAmount;
          if (typeof amount !== 'number' || isNaN(amount) || amount === 0) {
            return res.status(400).json({
              error: `O item "${item.description || 'sem descrição'}" do cartão ${c.bankName} está com valor inválido (R$ ${amount}).`,
              missingField: `cards[${idx}].items[${itemIdx}].amount`,
            });
          }
        }
      }
    }

    // 4. Processar transação no MySQL
    const result = await processInvoiceConfirmation({
      monthReferenced: monthReferenced.trim(),
      cards: hasCardsArray ? cards : undefined,
      bankName: !hasCardsArray ? bankName : undefined,
      brand: !hasCardsArray ? brand : undefined,
      last4Digits: !hasCardsArray ? last4Digits : undefined,
      items: !hasCardsArray ? items : undefined,
      overwriteExisting: Boolean(overwriteExisting),
      pdfPassword,
      declaredInvoiceTotal: declaredInvoiceTotal ? Number(declaredInvoiceTotal) : undefined,
    });

    return res.json({
      success: true,
      result,
    });
  } catch (error: any) {
    console.error('Erro na rota /api/confirm-invoice:', error);
    return res.status(500).json({
      error: 'Falha ao confirmar e salvar a fatura no MySQL: ' + error.message,
    });
  }
});
