import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { parseRouter } from './routes/parse.js';
import { confirmRouter } from './routes/confirm.js';
import { cardsRouter } from './routes/cards.js';
import { invoicesRouter } from './routes/invoices.js';
import { reportsRouter } from './routes/reports.js';
import { recurringRouter } from './routes/recurring.js';
import { settingsRouter } from './routes/settings.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: 20 * 1024 * 1024 }, // Max 20MB
}));

// Rotas da API
app.use('/api/parse-invoice', parseRouter);
app.use('/api/confirm-invoice', confirmRouter);
app.use('/api/cards', cardsRouter);
app.use('/api/invoices', invoicesRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/recurring', recurringRouter);
app.use('/api/settings', settingsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir arquivos estáticos do frontend em produção
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const nuxtDistPath = path.join(__dirname, '../app/.output/public');
const legacyDistPath = path.join(__dirname, '../dist');

function getDistPath(): string {
  if (fs.existsSync(nuxtDistPath)) return nuxtDistPath;
  return legacyDistPath;
}

app.use((req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const currentDist = getDistPath();
  express.static(currentDist)(req, res, next);
});

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    const currentDist = getDistPath();
    const indexPath = path.join(currentDist, 'index.html');
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    return res.status(404).send('Página não encontrada');
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor InvoiceTrack rodando em http://localhost:${PORT}`); // eslint-disable-line no-console -- banner de boot
});
