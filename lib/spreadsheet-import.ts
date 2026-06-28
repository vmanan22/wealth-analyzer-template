import readXlsxFile from "read-excel-file/node";
import type { CsvRow } from "@/lib/csv";

export async function parseXlsxRows(buffer: Buffer): Promise<CsvRow[]> {
  const rows = await readXlsxFile(buffer) as unknown as unknown[][];
  const nonEmptyRows = rows.filter((row) => row.some((cell) => cell !== null && cell !== undefined && String(cell).trim() !== ""));
  if (!nonEmptyRows.length) return [];

  const headerIndex = findHeaderRowIndex(nonEmptyRows);
  const headers = nonEmptyRows[headerIndex].map((cell) => String(cell ?? "").trim());
  return nonEmptyRows.slice(headerIndex + 1).flatMap((row) => {
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      record[header] = value === null || value === undefined ? "" : String(value).trim();
    });
    return Object.values(record).some(Boolean) ? [record] : [];
  });
}

function findHeaderRowIndex(rows: unknown[][]) {
  const headerHints = ["instrument", "tradingsymbol", "qty", "quantity", "isin", "ltp", "avg", "cur"];
  const index = rows.findIndex((row) => {
    const normalized = row.map((cell) => String(cell ?? "").toLowerCase()).join(" ");
    return headerHints.some((hint) => normalized.includes(hint));
  });
  return index >= 0 ? index : 0;
}
