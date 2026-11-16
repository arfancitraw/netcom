export function formatCurrency(amount, currency = 'R$') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency} 0.00`;
  }
  const numericValue = Number(amount);
  return `${currency} ${numericValue.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatInteger(value) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0';
  }
  return Number(value).toLocaleString('en-US');
}

export function formatCompactCurrency(amount, currency = 'R$') {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return `${currency} 0k`;
  }
  const numericValue = Number(amount);
  return `${currency} ${(numericValue / 1000).toFixed(0)}k`;
}

export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined || isNaN(Number(value))) {
    return '0.0%';
  }
  return `${Number(value).toFixed(decimals)}%`;
}

export function formatDateString(dateValue) {
  if (!dateValue) return '-';
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 10);
  }
  return String(dateValue);
}

export function formatDateTimeString(dateValue) {
  if (!dateValue) return '-';
  if (typeof dateValue === 'string') {
    return dateValue.substring(0, 16).replace('T', ' ');
  }
  return String(dateValue);
}
