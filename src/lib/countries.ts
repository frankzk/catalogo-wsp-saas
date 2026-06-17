/** Minimal country list for the phone access screen. Pure module. */

export interface Country {
  code: string; // ISO-3166 alpha-2
  name: string;
  dial: string; // calling code without "+"
  len: number; // expected national number length (digits)
  flag: string;
}

export const COUNTRIES: Country[] = [
  { code: "MX", name: "México", dial: "52", len: 10, flag: "🇲🇽" },
  { code: "CO", name: "Colombia", dial: "57", len: 10, flag: "🇨🇴" },
  { code: "PE", name: "Perú", dial: "51", len: 9, flag: "🇵🇪" },
  { code: "CL", name: "Chile", dial: "56", len: 9, flag: "🇨🇱" },
  { code: "AR", name: "Argentina", dial: "54", len: 10, flag: "🇦🇷" },
  { code: "EC", name: "Ecuador", dial: "593", len: 9, flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", dial: "591", len: 8, flag: "🇧🇴" },
  { code: "GT", name: "Guatemala", dial: "502", len: 8, flag: "🇬🇹" },
  { code: "CR", name: "Costa Rica", dial: "506", len: 8, flag: "🇨🇷" },
  { code: "PA", name: "Panamá", dial: "507", len: 8, flag: "🇵🇦" },
  { code: "DO", name: "Rep. Dominicana", dial: "1", len: 10, flag: "🇩🇴" },
  { code: "US", name: "Estados Unidos", dial: "1", len: 10, flag: "🇺🇸" },
  { code: "ES", name: "España", dial: "34", len: 9, flag: "🇪🇸" },
];

export function countryByCode(code?: string | null): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code.toUpperCase());
}

/** Build an E.164 phone string: dial + national digits. */
export function toE164(dial: string, national: string): string {
  return `+${dial}${national.replace(/\D/g, "")}`;
}

/** Validate a national number against a country's expected length. */
export function isValidNationalNumber(country: Country, national: string): boolean {
  const digits = national.replace(/\D/g, "");
  return digits.length === country.len;
}
