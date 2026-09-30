import { InvoiceParserStrategy, ExtractedInvoiceResult } from './InvoiceParserInterface.js';
import { PicPayInvoiceParser } from './PicPayParser.js';
import { InterInvoiceParser } from './InterParser.js';
import { AtacadaoInvoiceParser } from './AtacadaoParser.js';
import { MercadoPagoInvoiceParser } from './MercadoPagoParser.js';
import { BradescoInvoiceParser } from './BradescoParser.js';
import { GenericInvoiceParser } from './GenericParser.js';
import { logger } from '../../utils/logger.js';

export class InvoiceParserFactory {
  private static strategies: InvoiceParserStrategy[] = [
    new PicPayInvoiceParser(),
    new InterInvoiceParser(),
    new AtacadaoInvoiceParser(),
    new MercadoPagoInvoiceParser(),
    new BradescoInvoiceParser(),
    // Novas estratégias de bancos podem ser registradas aqui
  ];

  private static genericStrategy = new GenericInvoiceParser();

  public static registerStrategy(strategy: InvoiceParserStrategy) {
    this.strategies.unshift(strategy);
  }

  public static getParser(text: string): InvoiceParserStrategy {
    for (const strategy of this.strategies) {
      if (strategy.canParse(text)) {
        logger.info(`[InvoiceParserFactory] Selecionada estratégia: ${strategy.name}`);
        return strategy;
      }
    }
    logger.info('[InvoiceParserFactory] Selecionada estratégia genérica de Fallback');
    return this.genericStrategy;
  }

  public static parse(text: string): ExtractedInvoiceResult {
    const parser = this.getParser(text);
    return parser.parse(text);
  }
}
