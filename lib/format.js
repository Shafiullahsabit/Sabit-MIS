export function formatAFN(amount, locale = "en-AF") {
  return `AFN ${new Intl.NumberFormat(locale).format(amount)}`;
}
