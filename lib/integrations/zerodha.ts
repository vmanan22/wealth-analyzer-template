import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { parseCsv, parseMoney } from "@/lib/csv";
import { parseImportFile, type ParsedImportFile } from "@/lib/import-file";
import type { AssetClass } from "@prisma/client";

export class ZerodhaCsvIntegration implements PortfolioIntegration {
  readonly name = "Zerodha CSV";

  async importHoldings(): Promise<HoldingImportResult> {
    return {
      source: this.name,
      rows: [],
      warnings: ["TODO: map Zerodha holdings CSV columns to stock assets. Kite Connect can be added later with OAuth/API tokens."]
    };
  }
}

export async function syncZerodhaCsv(userId: string, csvText: string, fileName = "zerodha-holdings.csv") {
  return syncZerodhaRows(userId, { fileName, mode: "csv", rows: parseCsv(csvText), warnings: [] });
}

export async function syncZerodhaFile(userId: string, file: File) {
  return syncZerodhaRows(userId, await parseImportFile(file));
}

async function syncZerodhaRows(userId: string, parsed: ParsedImportFile) {
  const source = await upsertDataSource(userId);
  const started = new Date();
  const warnings: string[] = [...parsed.warnings];
  let importedCount = 0;
  let updatedCount = 0;
  const rows = parsed.rows;

  for (const row of rows) {
    const rawSymbol = cell(row, ["symbol", "tradingsymbol", "trading symbol", "instrument", "scrip", "security", "name"]);
    const symbol = normalizeSymbol(rawSymbol);
    const name = cell(row, ["company_name", "company name", "name", "instrument", "scrip name", "security name"]) || symbol;
    if (!symbol || !name) {
      warnings.push("Skipped Zerodha row without symbol/name.");
      continue;
    }
    const quantity = parseMoney(cell(row, ["quantity", "qty", "qty.", "units", "holding qty", "total qty"]));
    const averageBuyPrice = parseMoney(cell(row, ["average_buy_price", "average price", "average_price", "avg_price", "avg. cost", "avg cost", "avg. price", "buy avg"]));
    const currentPrice = parseMoney(cell(row, ["current_price", "current price", "last_price", "last price", "ltp", "market price"]));
    const investedAmount = parseMoney(cell(row, ["invested_amount", "invested amount", "investment", "cost", "buy value"])) || quantity * averageBuyPrice;
    const currentValue = parseMoney(cell(row, ["current_value", "current value", "cur. val", "cur val", "market value", "value"])) || quantity * currentPrice || investedAmount;
    const exchange = cell(row, ["exchange", "segment"]) || "NSE";
    const isin = cell(row, ["isin", "isin code"]);
    const assetClass: AssetClass = inferAssetClass(row, symbol);

    const existing = await prisma.asset.findFirst({ where: { userId, OR: [{ symbol }, ...(isin ? [{ metadata: { path: ["isin"], equals: isin } }] : [])] } });
    const asset = existing
      ? await prisma.asset.update({
          where: { id: existing.id },
          data: { name, assetClass, platform: "Zerodha", units: quantity, currentPrice, investedAmount, currentValue, exchange, sector: cell(row, ["sector"]) || existing.sector, metadata: { source: "zerodha_csv", isin: isin || undefined, importedAt: new Date().toISOString() } }
        })
      : await prisma.asset.create({
          data: { userId, ownerType: "SELF", assetClass, name, platform: "Zerodha", investedAmount, currentValue, units: quantity, currentPrice, liquidity: "HIGH", taxCategory: assetClass === "ETF" ? "ETF" : "Listed Equity", symbol, exchange, sector: cell(row, ["sector"]) || undefined, metadata: { source: "zerodha_csv", isin: isin || undefined, importedAt: new Date().toISOString() } }
        });

    if (existing) updatedCount += 1;
    else importedCount += 1;

    const instrument = await prisma.instrument.upsert({
      where: { id: await findOrCreateInstrumentId(userId, symbol, isin, name, assetClass, exchange) },
      update: { name, isin: isin || undefined, symbol, exchange, assetClass },
      create: { userId, name, isin: isin || undefined, symbol, exchange, assetClass }
    });

    if (currentPrice) {
      await prisma.marketQuote.create({ data: { instrumentId: instrument.id, price: currentPrice, source: "Zerodha CSV", asOfDate: new Date() } });
    }

    await prisma.advisorContextItem.create({
      data: {
        userId,
        dataSourceId: source.id,
        kind: "HOLDING",
        title: `${symbol} holding`,
        source: "Zerodha",
        asOfDate: new Date(),
        confidence: 0.9,
        staleness: "fresh",
        payload: { assetId: asset.id, symbol, name, quantity, averageBuyPrice, currentPrice, investedAmount, currentValue, exchange, decisionUse: "decision_support_only" }
      }
    });
  }

  if (!importedCount && !updatedCount && !warnings.length) {
    warnings.push(`No holdings imported. Detected columns: ${Object.keys(rows[0] ?? {}).join(", ") || "none"}`);
  }

  await prisma.importBatch.create({
    data: {
      userId,
      importType: "ZERODHA",
      fileName: parsed.fileName,
      rowCount: rows.length,
      importedCount,
      duplicateCount: 0,
      status: warnings.length && !importedCount && !updatedCount ? "NEEDS_REVIEW" : "IMPORTED",
      mapping: { warnings }
    }
  });
  await prisma.syncRun.create({ data: { userId, dataSourceId: source.id, provider: "ZERODHA", status: warnings.length ? "SYNCED" : "SYNCED", importedCount, updatedCount, warningCount: warnings.length, warnings, startedAt: started, completedAt: new Date() } });
  await prisma.dataSource.update({ where: { id: source.id }, data: { status: "SYNCED", lastSyncAt: new Date(), metadata: { mode: parsed.mode, note: "Kite Connect OAuth can replace file input when credentials are configured." } } });
  return { importedCount, updatedCount, warnings };
}

async function upsertDataSource(userId: string) {
  return prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: "ZERODHA" } },
    create: { userId, provider: "ZERODHA", name: "Zerodha", authType: "OAUTH", status: "CONFIG_REQUIRED", metadata: { docs: "https://kite.trade/docs/connect/v3/portfolio/" } },
    update: {}
  });
}

async function findOrCreateInstrumentId(userId: string, symbol: string, isin: string | undefined, name: string, assetClass: AssetClass, exchange: string) {
  const existing = await prisma.instrument.findFirst({ where: { userId, OR: [{ symbol }, ...(isin ? [{ isin }] : [])] } });
  if (existing) return existing.id;
  const created = await prisma.instrument.create({ data: { userId, symbol, isin: isin || undefined, name, assetClass, exchange } });
  return created.id;
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

function normalizeSymbol(value: string) {
  return value.trim().replace(/^(NSE|BSE):/i, "").split(/\s+/)[0].toUpperCase();
}

function inferAssetClass(row: Record<string, string>, symbol: string): AssetClass {
  const instrumentType = cell(row, ["instrument_type", "instrument type", "asset class", "type", "product"]);
  const haystack = `${instrumentType} ${symbol}`.toUpperCase();
  return /ETF|BEES|NIFTYETF|GOLDETF/.test(haystack) ? "ETF" : "STOCK";
}
