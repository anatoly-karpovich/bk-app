const numberFormatter = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

export function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

/** Russian count declension: forms = [1, 2–4, 5+]. */
export function pluralizeRu(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count) % 100;
  const unit = abs % 10;
  if (abs > 10 && abs < 20) return forms[2];
  if (unit === 1) return forms[0];
  if (unit >= 2 && unit <= 4) return forms[1];
  return forms[2];
}
