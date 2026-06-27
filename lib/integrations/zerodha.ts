import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";
import { prisma } from "@/lib/prisma";
import { parseCsv, parseMoney } from "@/lib/csv";
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

export async function syncZerodhaCsv(userId: string, csvText: string) {
  const rows = parseCsv(csvText);
  const source = await upsertDataSource(userId);
  const started = new Date();
  const warnings: string[] = [];
  let importedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const symbol = row.symbol || row.tradingsymbol || row.Symbol;
    const name = row.company_name || row.name || row.instrument || symbol;
    if (!symbol || !name) {
      warnings.push("Skipped Zerodha row without symbol/name.");
      continue;
    }
    const quantity = Number(row.quantity || row.qty || row.units || 0);
    const averageBuyPrice = parseMoney(row.average_buy_price || row.average_price || row.avg_price);
    const currentPrice = parseMoney(row.current_price || row.last_price || row.ltp);
    const investedAmount = parseMoney(row.invested_amount) || quantity * averageBuyPrice;
    const currentValue = parseMoney(row.current_value) || quantity * currentPrice || investedAmount;
    const assetClass: AssetClass = String(row.instrument_type || row.assetClass || "").toUpperCase().includes("ETF") ? "ETF" : "STOCK";

    const existing = await prisma.asset.findFirst({ where: { userId, symbol } });
    const asset = existing
      ? await prisma.asset.update({
          where: { id: existing.id },
          data: { name, assetClass, platform: "Zerodha", units: quantity, currentPrice, investedAmount, currentValue, exchange: row.exchange || "NSE", sector: row.sector || existing.sector, metadata: { source: "zerodha_csv", isin: row.isin } }
        })
      : await prisma.asset.create({
          data: { userId, ownerType: "SELF", assetClass, name, platform: "Zerodha", investedAmount, currentValue, units: quantity, currentPrice, liquidity: "HIGH", taxCategory: "Listed Equity", symbol, exchange: row.exchange || "NSE", sector: row.sector, metadata: { source: "zerodha_csv", isin: row.isin } }
        });

    if (existing) updatedCount += 1;
    else importedCount += 1;

    const instrument = await prisma.instrument.upsert({
      where: { id: await findOrCreateInstrumentId(userId, symbol, row.isin, name, assetClass, row.exchange || "NSE") },
      update: { name, isin: row.isin || undefined, symbol, exchange: row.exchange || "NSE", assetClass },
      create: { userId, name, isin: row.isin || undefined, symbol, exchange: row.exchange || "NSE", assetClass }
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
        payload: { assetId: asset.id, symbol, name, quantity, averageBuyPrice, currentPrice, investedAmount, currentValue, decisionUse: "decision_support_only" }
      }
    });
  }

  await prisma.syncRun.create({ data: { userId, dataSourceId: source.id, provider: "ZERODHA", status: warnings.length ? "SYNCED" : "SYNCED", importedCount, updatedCount, warningCount: warnings.length, warnings, startedAt: started, completedAt: new Date() } });
  await prisma.dataSource.update({ where: { id: source.id }, data: { status: "SYNCED", lastSyncAt: new Date(), metadata: { mode: "csv_or_mock", note: "Kite Connect OAuth can replace CSV input when credentials are configured." } } });
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
