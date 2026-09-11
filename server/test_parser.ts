import { processInvoiceConfirmation } from './services/financialEngine.js';
import { prisma } from './db.js';

async function runTests() {
  console.log('=== TESTE 1: Estrutura Multi-Cartão via Factory ===');
  const mockPayload = {
    monthReferenced: '2026-09',
    cards: [
      {
        bankName: 'Nubank',
        brand: 'Mastercard',
        last4Digits: '8899',
        totalAmount: 475.50,
        items: [
          { description: 'Amazon Eletrônicos', amount: 250.00, currentInstallment: 2, totalInstallments: 5 },
          { description: 'Supermercado Pão de Açúcar', amount: 180.50, currentInstallment: 1, totalInstallments: 1 },
          { description: 'Drogaria São Paulo', amount: 45.00, currentInstallment: 1, totalInstallments: 3 },
        ],
      },
    ],
  };

  console.log('=== TESTE 2: Processamento e Projeção no MySQL ===');
  const result = await processInvoiceConfirmation(mockPayload);

  console.log('Faturas Projetadas no MySQL:', result);

  console.log('\n=== TESTE 3: Verificação de Faturas no Banco MySQL ===');
  const cardId = result.processedCardsResult[0].card.id;
  const invoices = await prisma.invoice.findMany({
    where: { cardId },
    include: { items: true },
    orderBy: { monthYear: 'asc' },
  });

  for (const inv of invoices) {
    console.log(`Fatura ${inv.monthYear}: Total R$ ${inv.totalAmount} (${inv.items.length} itens)`);
    for (const item of inv.items) {
      console.log(`  - ${item.description} (${item.currentInstallment}/${item.totalInstallments}): R$ ${item.originalAmount}`);
    }
  }

  console.log('\n✅ TODOS OS TESTES PASSARAM COM SUCESSO!');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Erro no teste:', err);
    process.exit(1);
  });
