import { PDFParse } from "pdf-parse";
import type { CsvRow } from "@/lib/csv";
import { parseCsv } from "@/lib/csv";
import { parseXlsxRows } from "@/lib/spreadsheet-import";

export type ParsedImportFile = {
  fileName: string;
  mode: "csv" | "xlsx" | "pdf";
  rows: CsvRow[];
  rawText?: string;
  warnings: string[];
};

export async function parseImportFile(file: File): Promise<ParsedImportFile> {
  const fileName = file.name || "uploaded-file";
  const lowerName = fileName.toLowerCase();
  const warnings: string[] = [];

  if (lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls") || /spreadsheet|excel/i.test(file.type)) {
    const rows = await parseXlsxRows(Buffer.from(await file.arrayBuffer()));
    return { fileName, mode: "xlsx", rows, warnings };
  }

  if (lowerName.endsWith(".pdf") || file.type === "application/pdf") {
    const parser = new PDFParse({ data: Buffer.from(await file.arrayBuffer()) });
    const data = await parser.getText();
    await parser.destroy();
    const rawText = data.text.trim();
    const rows = rowsFromPdfText(rawText);
    if (!rows.length) warnings.push("PDF text was extracted, but no table-like rows were detected. This statement may need a connector-specific parser.");
    return { fileName, mode: "pdf", rows, rawText, warnings };
  }

  const rows = parseCsv(await file.text());
  return { fileName, mode: "csv", rows, warnings };
}

function rowsFromPdfText(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const headerIndex = lines.findIndex((line) => /isin|instrument|tradingsymbol|scheme|folio|policy|epf|nps|plot|value|units|amount/i.test(line));
  if (headerIndex < 0) return [];

  const headers = splitPdfLine(lines[headerIndex]);
  if (headers.length < 2) return [];

  return lines.slice(headerIndex + 1).flatMap((line) => {
    const values = splitPdfLine(line);
    if (values.length < 2) return [];
    const record: CsvRow = {};
    headers.forEach((header, index) => {
      if (!header) return;
      record[header] = values[index] ?? "";
    });
    return Object.values(record).some(Boolean) ? [record] : [];
  });
}

function splitPdfLine(line: string) {
  return line.split(/\t+|\s{2,}/).map((cell) => cell.trim()).filter(Boolean);
}
