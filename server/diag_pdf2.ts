import { buildPdfReport } from './services/exportPdf.js';
const b = await buildPdfReport({});
console.log('type:', b.constructor.name, '| len:', b.length, '| head:', JSON.stringify(b.slice(0, 8).toString('latin1')));
