const CURRENCY_CODES = new Set([
  'USD', 'EUR', 'GBP', 'NGN', 'KES', 'ZAR', 'GHS', 'CAD', 'AUD', 'INR',
]);

export const extractSalaryCurrency = (...values) => {
  for (const value of values) {
    const explicitCode = typeof value === 'object' && value
      ? value.currency || value.currencyCode || value.currency_code
      : '';
    const text = `${explicitCode || ''} ${typeof value === 'string' ? value : ''}`;
    const match = text.match(/\b([A-Z]{3})\b/i)?.[1]?.toUpperCase();
    if (match && CURRENCY_CODES.has(match)) return match;
    if (typeof value === 'string') {
      if (value.includes('₦')) return 'NGN';
      if (value.includes('£')) return 'GBP';
      if (value.includes('€')) return 'EUR';
    }
  }
  return '';
};
