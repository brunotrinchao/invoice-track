---
type: doc
name: project-overview
description: High-level overview of the project, its purpose, and key components
category: overview
generated: 2026-09-10
status: filled
scaffoldVersion: "2.0.0"
---

# Project Overview

Invoice-Track é uma ferramenta de **previsibilidade de faturas de cartão de crédito**. O usuário faz upload de PDFs de faturas (banco/emissor), o sistema extrai lançamentos via IA (Gemini) com fallback regex, consolida por mês de referência e projeta o total de faturas futuras — gerando relatório de previsibilidade financeira.

> **Semantic Snapshot**: Use `context({ action: "getMap", section: "all" })` for generated stack, architecture layers, key files, and dependency hotspots.

## Quick Facts

- Root: `/home/brunotrinchao/Documentos/Bruno/Invoice-Track`
- Languages: TypeScript (full stack), JavaScript (config)
- Entry backend: `server/index.ts` (Express)
- Entry frontend: `src/main.tsx` → `src/App.tsx` (React 18 + Vite)
- Database: MySQL via Prisma (`prisma/schema.prisma`)
- Semantic snapshot: `context({ action: "getMap", section: "all" })`

## Entry Points

- `server/index.ts` — servidor Express, ponto de entrada backend
- `server/routes/reports.ts` — rotas de relatórios/previsibilidade
- `src/App.tsx` — raiz da SPA (estado global de cards/faturas, toasts)
- `src/main.tsx` — bootstrap Vite/React
- `server/test_parser.ts` — script ad-hoc de teste dos parsers

## Key Exports

### Backend (services)
- `processInvoiceConfirmation` @ `server/services/financialEngine.ts:73` — núcleo: consolida confirmação de fatura
- `classifyItemType` @ `server/services/financialEngine.ts:20` — classificação de item (compra/taxa/juros)
- `addMonthsToYearMonth` @ `server/services/financialEngine.ts:51` — aritmética de mês de referência
- `extractWithAI` @ `server/services/aiExtractor.ts:5` — extração via Gemini (`@google/generative-ai`)
- `extractWithRegex` @ `server/services/regexExtractor.ts:12` — fallback determinístico
- `parsePdfInvoice` @ `server/services/pdfParser.ts:5` — texto do PDF via `pdf-parse`

### Parsers (strategy pattern)
- Interface: `InvoiceParserStrategy` @ `server/services/parsers/InvoiceParserInterface.ts:27`
- Factory: `InvoiceParserFactory` @ `server/services/parsers/InvoiceParserFactory.ts:9`
- Implementações: `AtacadaoInvoiceParser`, `BradescoInvoiceParser`, `InterInvoiceParser`, `MercadoPagoInvoiceParser`, `PicPayInvoiceParser`, `GenericInvoiceParser`

### Frontend (types)
- `src/types/index.ts` — `Card`, `Invoice`, `InvoiceItem`, `ParsedCardTransactions`, `ParseResponse`, `PredictabilityMetrics`, `MonthlySummaryItem`, `PredictabilityReportData`

## File Structure & Code Organization

- `src/` — frontend React (SPA)
- `src/components/` — componentes: `PdfUploader`, `ConfirmationModal`, `InvoiceManagement`, `InvoiceList`, `PredictabilityChart`, `CreditCardWidget`, `MultiSelectCardFilter`, `Header`
- `src/types/` — tipos compartilhados frontend
- `server/` — backend Express + serviços
- `server/services/` — lógica de negócio (financialEngine, aiExtractor, regexExtractor, pdfParser)
- `server/services/parsers/` — parsers por emissor (strategy + factory)
- `server/routes/` — handlers de rota (reports)
- `server/tests/` — scripts de teste ad-hoc (sem framework)
- `prisma/` — schema e migrations MySQL

## Technology Stack Summary

Full TypeScript monorepo simples: backend **Node + Express** rodando com `tsx watch`, extração de PDF com `pdf-parse`, LLM via `@google/generative-ai` (Gemini), persistência **MySQL + Prisma 5**. Frontend **React 18 + Vite 5 + Tailwind CSS 3** com gráficos **Recharts** e ícones `lucide-react`. Sem framework de teste instalado — testes são scripts ad-hoc.

## Core Framework Stack

- **Backend**: Express 4 (`express`, `cors`, `express-fileupload`), runtime `tsx` (sem build para dev)
- **Dados**: Prisma 5 + MySQL; `dotenv` para config
- **Frontend**: React 18 (hooks), Vite 5, Tailwind 3, Recharts 2
- **Padrão arquitetural**: Strategy para parsers (interface `InvoiceParserStrategy` + factory), serviços desacoplados de rotas

## Getting Started Checklist

1. Instalar dependências: `npm install`
2. Configurar `.env` (DATABASE_URL MySQL, chave Gemini para extração IA)
3. Preparar schema: `npm run db:generate` e `npm run db:push`
4. Rodar dev (backend + frontend juntos): `npm run dev`
5. Verificar build: `npm run build`
6. Revisar [Development Workflow](./development-workflow.md) e [Tooling](./tooling.md)
