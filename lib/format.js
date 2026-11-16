export function formatAFN(amount, numberLocale = "en-AF") {
  return `AFN ${new Intl.NumberFormat(numberLocale).format(amount)}`;
}

export function formatTime(time, numberLocale = "en-AF") {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date(Date.UTC(2026, 0, 1, hours, minutes));

  return new Intl.DateTimeFormat(numberLocale, {
    hour: "numeric",
    hour12: true,
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}
