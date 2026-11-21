// All player-facing text lives in locale tables. English first; other languages after the English is final (D6).

import { en } from '../content/locale/en';

export type Table = Record<string, string>;

const tables: Record<string, Table> = { en };
let current = 'en';
const missing = new Set<string>();

export function setLanguage(lang: string): void {
  if (!tables[lang]) throw new Error(`unknown language ${lang}`);
  current = lang;
}

export function addTable(lang: string, table: Table): void {
  tables[lang] = { ...(tables[lang] ?? {}), ...table };
}

/** Looks up a key and fills {placeholders}. Falls back to English, then to the key itself. */
export function t(key: string, vars: Record<string, string | number> = {}): string {
  const raw = tables[current]?.[key] ?? tables.en?.[key];
  if (raw === undefined) {
    if (!missing.has(key)) {
      missing.add(key);
      console.warn(`missing text key: ${key}`);
    }
    return key;
  }
  return raw.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export function hasKey(key: string): boolean {
  return key in (tables.en ?? {});
}
