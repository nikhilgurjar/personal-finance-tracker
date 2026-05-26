/**
 * Format an amount in the specified currency using the local rules.
 * Default is INR and en-IN locale.
 */
export function formatCurrency(
  amount: number,
  currency: string = 'INR',
  locale: string = 'en-IN'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch (error) {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/**
 * Resolve effective currency for an entity, fallback to user baseCurrency.
 */
export function getEffectiveCurrency(
  entityCurrency?: string,
  userBaseCurrency: string = 'INR'
): string {
  return entityCurrency ?? userBaseCurrency;
}
