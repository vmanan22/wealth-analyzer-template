import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { parseCsv, parseMoney } from "@/lib/csv";
import { parseImportFile, type ParsedImportFile } from "@/lib/import-file";

export class KuveraCsvIntegration implements PortfolioIntegration {
  readonly name = "Kuvera CSV";

  async importHoldings(): Promise<HoldingImportResult> {
    return {
      source: this.name,
      rows: [],
      warnings: ["TODO: map Kuvera/CAS statement rows to mutual fund assets and transactions."]
    };
  }
}

export async function syncCasCsv(userId: string, csvText: string) {
  return syncCasRows(userId, { fileName: "cas-holdings.csv", mode: "csv", rows: parseCsv(csvText), warnings: [] });
}

export async function syncCasFile(userId: string, file: File) {
  return syncCasRows(userId, await parseImportFile(file));
}

async function syncCasRows(userId: string, parsed: ParsedImportFile) {
  const rows = parsed.rows;
  const source = await prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: "CAS" } },
    create: { userId, provider: "CAS", name: "CAS / CAMS / KFintech / MFCentral", authType: "FILE_UPLOAD", status: "CONFIG_REQUIRED", metadata: { note: "Upload CAMS/KFintech/MFCentral CAS export; no Kuvera credentials required." } },
    update: {}
  });
  const started = new Date();
  const warnings: string[] = [...parsed.warnings];
  let importedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const schemeName = cell(row, ["scheme_name", "scheme name", "scheme", "name", "fund", "description"]);
    if (!schemeName) {
      warnings.push("Skipped CAS row without scheme name.");
      continue;
    }
    const units = parseMoney(cell(row, ["units", "balance_units", "balance units", "closing balance", "unit balance"]));
    const nav = parseMoney(cell(row, ["nav", "current_nav", "current nav", "price"]));
    const investedAmount = parseMoney(cell(row, ["invested_amount", "invested amount", "cost_value", "cost value", "amount", "investment"]));
    const currentValue = parseMoney(cell(row, ["current_value", "current value", "market_value", "market value", "valuation"])) || units * nav || investedAmount;
    const isin = cell(row, ["isin", "isin code"]) || undefined;
    const folio = cell(row, ["folio", "folio_number", "folio number", "account number"]);

    const existing = await prisma.asset.findFirst({ where: { userId, assetClass: "MUTUAL_FUND", name: schemeName } });
    const asset = existing
      ? await prisma.asset.update({ where: { id: existing.id }, data: { units, currentPrice: nav || undefined, investedAmount, currentValue, platform: "CAS", folioMasked: maskLast4(folio), metadata: { source: `cas_${parsed.mode}`, isin } } })
      : await prisma.asset.create({ data: { userId, ownerType: "SELF", assetClass: "MUTUAL_FUND", name: schemeName, platform: "CAS", investedAmount, currentValue, units, currentPrice: nav || undefined, liquidity: "MEDIUM", taxCategory: cell(row, ["taxCategory", "tax category"]) || "Mutual Fund", schemeCategory: cell(row, ["category", "scheme category"]) || undefined, folioMasked: maskLast4(folio), metadata: { source: `cas_${parsed.mode}`, isin } } });

    if (existing) updatedCount += 1;
    else importedCount += 1;

    await prisma.advisorContextItem.create({
      data: {
        userId,
        dataSourceId: source.id,
        kind: "MF_PORTFOLIO",
        title: `${schemeName} CAS position`,
        source: "CAS",
        asOfDate: cell(row, ["as_of_date", "as of date", "date"]) ? new Date(cell(row, ["as_of_date", "as of date", "date"])) : new Date(),
        confidence: parsed.mode === "pdf" ? 0.72 : 0.85,
        staleness: cell(row, ["as_of_date", "as of date", "date"]) ? "fresh" : "manual",
        payload: { assetId: asset.id, schemeName, isin, units, nav, investedAmount, currentValue, folioMasked: maskLast4(folio), decisionUse: "decision_support_only" }
      }
    });
  }

  await prisma.importBatch.create({
    data: {
      userId,
      importType: "CAS",
      fileName: parsed.fileName,
      rowCount: rows.length,
      importedCount,
      duplicateCount: 0,
      status: warnings.length && !importedCount && !updatedCount ? "NEEDS_REVIEW" : "IMPORTED",
      mapping: { warnings, mode: parsed.mode }
    }
  });
  await prisma.syncRun.create({ data: { userId, dataSourceId: source.id, provider: "CAS", status: "SYNCED", importedCount, updatedCount, warningCount: warnings.length, warnings, startedAt: started, completedAt: new Date() } });
  await prisma.dataSource.update({ where: { id: source.id }, data: { status: "SYNCED", lastSyncAt: new Date(), metadata: { mode: parsed.mode, note: "CAS/CAMS/KFintech/MFCentral file upload." } } });
  return { importedCount, updatedCount, warnings };
}

function maskLast4(value?: string) {
  if (!value) return undefined;
  return `****${value.slice(-4)}`;
}

function normalizedKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function cell(row: Record<string, string>, aliases: string[]) {
  const entries = Object.entries(row);
  const normalizedAliases = aliases.map(normalizedKey);
  const match = entries.find(([key]) => normalizedAliases.includes(normalizedKey(key)));
  return match?.[1]?.trim() ?? "";
}
