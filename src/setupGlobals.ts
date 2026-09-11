import momentImport from 'moment';
import $ from 'jquery';

const moment = typeof momentImport === 'function' ? momentImport : (momentImport as any).default;

if (typeof window !== 'undefined') {
  (window as any).moment = moment;
  (window as any).$ = $;
  (window as any).jQuery = $;
}

export { moment, $ };
