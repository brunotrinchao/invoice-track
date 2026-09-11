import { parseMercadoPagoText } from './ScannerTest.js';

const multiLineText = `
MERCADO PAGO BRASIL
Vencimento: 17/08/2026
Total a pagar R$ 1.987,88

Cartão Visa [************4422]
11/03
MERCADOLIVRE 2 PRODUTOS
Parcela 17 de 21
R$ 131,94
15/12
MPALETAONLINE
Parcela 8 de 8
R$ 18,41
17/02
SHOPEE "HypeRoots
Parcela 6 de 10
R$ 5,76
14/07
MP MELIMAIS
R$ 19,90
Total R$ 2.035,71

Cartão Visa [************2207]
25/07
VAREJAO LRC
R$ 58,65
25/07
SUPERMERCADOS BH
R$ 29,00
Total R$ 87,65
`;

const res = parseMercadoPagoText(multiLineText);
console.log('=== MULTI-LINE SCANNER TEST RESULT ===');
console.log('Month Referenced:', res.monthReferenced);
console.log('Cards Count:', res.cards.length);
res.cards.forEach((c) => {
  console.log(`Card (${c.last4Digits}): Total = R$ ${c.totalAmount}, Items = ${c.items.length}`);
  c.items.forEach((i) => console.log(`  - ${i.purchaseDate} | ${i.description} | ${i.currentInstallment}/${i.totalInstallments} | R$ ${i.amount}`));
});
