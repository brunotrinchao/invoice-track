# Session State — Invoice-Track fixes

## Objetivo
Corrigir bugs de importação de faturas PDF (valores taxas/créditos/totais errados) no projeto Invoice-Track (React+Express+Prisma+MySQL, ~/Documentos/Bruno/Invoice-Track).

## Arquivos modificados (todos verificados com tsc OK)
1. `server/services/parsers/MercadoPagoParser.ts` — totalAmount = soma REAL items (não total declarado PDF); itemType propagado (CREDIT/TAX/INTEREST/FINE/FEE); primaryLast4 sem hardcode '4422' (nullable)
2. `server/services/financialEngine.ts` — overwriteExisting respeitado (skip itens se fatura existe sem overwrite); declaredInvoiceTotal salvo em declaredAmount; classifyItemType: IOF check ANTES de ROTATIVO (IOF do rotativo = TAX não INTEREST); extractedBy propagado
3. `server/routes/reports.ts` — fallback fees não duplica (itemsFallbackUsed flag)
4. `prisma/schema.prisma` — Invoice.declaredAmount (Decimal?, @map declared_amount); db push + generate feitos
5. `server/services/parsers/InterParser.ts` — filtra PAGTO/DEBITO AUTOMATICO/PAGAMENTO; itemType SEGURO=FEE
6. `server/services/parsers/AtacadaoParser.ts` — canParse inclui 'ATACADAO'/'FATURA MENSAL CARTÃO MASTERCARD GOLD' (PDF real não dizia ATACADÃO)
7. `server/services/aiExtractor.ts` — prompt: declaredInvoiceTotal no JSON; reforça "Movimentações na fatura" MP (taxas/multas/créditos); filtra PAGTO DEBITO AUTOMATICO pós-processamento; retorna declaredInvoiceTotal
8. `server/tests/parsers.test.ts` — 9 testes node:test (9/9 pass)

## PDFs reais analisados (~/Downloads)
- MarcadoPAgo_Fatura_20260817_unlocked.pdf: boleto 1987.88; card 4422 total 2035.71 (só compras), soma real 1869.95 (com taxas -créditos); card 2207 87.65. Seção "Movimentações na fatura" = IOF 7.24, Juros rotativo 41.83, Multa 51.05, Juros mora 2.34, Créditos -268.22
- Inter_Fatura_2026_unlocked.pdf: 4 cartões (3414/4899/6135/6691) soma 4031.83 = boleto ✓. PAGTO DEBITO AUTOMATICO +R$ 4551.18 deve ser ignorado
- Atacadao_Fatura_092026_unlocked.pdf: 136.20 = 119.21 (compra) + 16.99 (anuidade); banco detectável por "FATURA MENSAL CARTÃO MASTERCARD GOLD" + 543882******5176
- BradescoCartoes10-09-2026-11-27-46.pdf: 3 cartões soma 4149.52 ✓
- PicPay_Fatura_092026.pdf: 766.66 ✓

## Decisões
- totalAmount do parser = soma items (consistência com engine que recalcula); declaredTotal PDF só fallback se 0 items
- declaredInvoiceTotal do boleto salvo em Invoice.declaredAmount p/ conferência (não usado em total)
- Engine recalcula totals por itemType classificada; duplicação fees evitada por dedupe descrição+valor

## Bugs abertos / pendentes
- Fatura MP 2026-08 (id ea60951a) salva com 1738.03 SEM taxas — dados antigos de antes dos fixes; usuário precisa re-importar com overwrite. NÃO é bug atual do código (parse atual retorna 1869.95 com taxas)
- Erro "Unexpected end of JSON input" = servidor tsx watch morre (harness mata com timeout 120s) → resposta vazia. Frontend ConfirmationModal/PdfUploader usam res.json() sem proteção (fix opcional: try/catch parse)
- Servidor: rodar `npx tsx watch server/index.ts` fora do harness (nohup ou terminal separado). Porta 3000
- Testes: `npx tsx --test server/tests/parsers.test.ts` (9 pass)

## Próximos passos
1. Verificar parse MP via API retorna declaredInvoiceTotal agora (prompt atualizado)
2. Re-importar fatura MP 2026-08 com overwrite p/ corrigir 1738.03 (usuário faz via UI)
3. Testar confirm completo MP (taxas somadas no total)
4. Opcional: try/catch res.json() no frontend (ConfirmationModal ~linha 379, PdfUploader)
5. Atualizar task list (tasks 5,7 pendentes)