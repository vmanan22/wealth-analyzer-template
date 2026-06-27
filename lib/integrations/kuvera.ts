import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { parseCsv, parseMoney } from "@/lib/csv";

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
  const rows = parseCsv(csvText);
  const source = await prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: "CAS" } },
    create: { userId, provider: "CAS", name: "CAS / CAMS / KFintech / MFCentral", authType: "FILE_UPLOAD", status: "CONFIG_REQUIRED", metadata: { note: "Upload CAMS/KFintech/MFCentral CAS export; no Kuvera credentials required." } },
    update: {}
  });
  const started = new Date();
  const warnings: string[] = [];
  let importedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const schemeName = row.scheme_name || row.scheme || row.name || row["Scheme Name"];
    if (!schemeName) {
      warnings.push("Skipped CAS row without scheme name.");
      continue;
    }
    const units = Number(row.units || row.balance_units || 0);
    const nav = parseMoney(row.nav || row.current_nav || row.price);
    const investedAmount = parseMoney(row.invested_amount || row.cost_value || row.amount);
    const currentValue = parseMoney(row.current_value || row.market_value) || units * nav || investedAmount;
    const isin = row.isin || row.ISIN || undefined;

    const existing = await prisma.asset.findFirst({ where: { userId, assetClass: "MUTUAL_FUND", name: schemeName } });
    const asset = existing
      ? await prisma.asset.update({ where: { id: existing.id }, data: { units, currentPrice: nav || undefined, investedAmount, currentValue, platform: "CAS", folioMasked: maskLast4(row.folio || row.folio_number), metadata: { source: "cas_csv", isin } } })
      : await prisma.asset.create({ data: { userId, ownerType: "SELF", assetClass: "MUTUAL_FUND", name: schemeName, platform: "CAS", investedAmount, currentValue, units, currentPrice: nav || undefined, liquidity: "MEDIUM", taxCategory: row.taxCategory || "Mutual Fund", schemeCategory: row.category, folioMasked: maskLast4(row.folio || row.folio_number), metadata: { source: "cas_csv", isin } } });

    if (existing) updatedCount += 1;
    else importedCount += 1;

    await prisma.advisorContextItem.create({
      data: {
        userId,
        dataSourceId: source.id,
        kind: "MF_PORTFOLIO",
        title: `${schemeName} CAS position`,
        source: "CAS",
        asOfDate: row.as_of_date ? new Date(row.as_of_date) : new Date(),
        confidence: 0.85,
        staleness: row.as_of_date ? "fresh" : "manual",
        payload: { assetId: asset.id, schemeName, isin, units, nav, investedAmount, currentValue, folioMasked: maskLast4(row.folio || row.folio_number), decisionUse: "decision_support_only" }
      }
    });
  }

  await prisma.syncRun.create({ data: { userId, dataSourceId: source.id, provider: "CAS", status: "SYNCED", importedCount, updatedCount, warningCount: warnings.length, warnings, startedAt: started, completedAt: new Date() } });
  await prisma.dataSource.update({ where: { id: source.id }, data: { status: "SYNCED", lastSyncAt: new Date() } });
  return { importedCount, updatedCount, warnings };
}

function maskLast4(value?: string) {
  if (!value) return undefined;
  return `****${value.slice(-4)}`;
}
