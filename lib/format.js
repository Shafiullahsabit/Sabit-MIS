export function formatAFN(amount, numberLocale = "en-AF") {
  return `AFN ${new Intl.NumberFormat(numberLocale).format(amount)}`;
}

export function formatTime(
  dateTime,
  numberLocale = "en-AF",
  timeZone = "Asia/Kabul",
) {
  return new Intl.DateTimeFormat(numberLocale, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone,
  }).format(new Date(dateTime));
}
