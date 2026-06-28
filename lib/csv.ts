import crypto from "node:crypto";
import Papa from "papaparse";

export type CsvRow = Record<string, string>;

export function parseCsv(text: string) {
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim()
  });

  if (parsed.errors.length) {
    throw new Error(parsed.errors.map((error) => error.message).join(", "));
  }

  return parsed.data;
}

export function rowHash(row: CsvRow, keys: string[]) {
  const payload = keys.map((key) => row[key] ?? "").join("|").toLowerCase();
  return crypto.createHash("sha256").update(payload).digest("hex");
}

export function parseMoney(value?: string | number | null) {
  if (!value) return 0;
  const normalized = String(value).replace(/[₹,\s,%]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (!normalized || normalized === "-") return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
