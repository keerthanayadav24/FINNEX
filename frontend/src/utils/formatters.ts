export const formatCurrency = (
  amount: number | string | null | undefined,
  showSymbol = true
): string => {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return showSymbol ? '₹0' : '0';
  }
  const numeric = Math.round(Number(amount));
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(numeric);

  return showSymbol ? `₹${formatted}` : formatted;
};

export const formatSignedCurrency = (
  amount: number | string | null | undefined,
  showSymbol = true
): string => {
  const numeric = Number(amount || 0);
  if (numeric === 0) return formatCurrency(0, showSymbol);
  const prefix = numeric > 0 ? '+' : '-';
  const absFormatted = formatCurrency(Math.abs(numeric), showSymbol);
  return `${prefix}${absFormatted}`;
};
