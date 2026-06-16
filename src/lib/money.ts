/** Money formatting for the public catalog (integer prices). Pure module. */

const SYMBOLS: Record<string, string> = {
  USD: "$",
  MXN: "$",
  COP: "$",
  CLP: "$",
  ARS: "$",
  PEN: "S/",
  BOB: "Bs",
  GTQ: "Q",
  DOP: "RD$",
  CRC: "₡",
  PAB: "B/.",
  EUR: "€",
};

export function currencySymbol(code?: string | null): string {
  return code ? (SYMBOLS[code.toUpperCase()] ?? "") : "";
}

/** Format an integer amount, e.g. 1999 -> "$1,999" (MXN) or "S/1,999" (PEN). */
export function formatMoney(amount: number, currency?: string | null): string {
  const sym = currencySymbol(currency);
  const n = Math.round(amount).toLocaleString("es");
  if (sym) return `${sym}${n}`;
  return currency ? `${n} ${currency}` : n;
}
