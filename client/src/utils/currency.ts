const COUNTRY_CURRENCY: Record<string, string> = {
  'USA': '$',
  'United Kingdom': '£',
  'Germany': '€',
  'France': '€',
  'India': '₹',
  'Japan': '¥',
  'Brazil': 'R$',
  'Australia': 'A$',
};

export function getCurrencySymbol(country: string): string {
  return COUNTRY_CURRENCY[country] ?? '';
}
