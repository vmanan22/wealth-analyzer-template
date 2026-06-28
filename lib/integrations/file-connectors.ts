import type { AssetClass, DataSourceProvider, LiquidityCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseMoney } from "@/lib/csv";
import { parseImportFile, type ParsedImportFile } from "@/lib/import-file";

type FileConnectorConfig = {
  provider: Extract<DataSourceProvider, "LIC" | "EPFO" | "NPS" | "LAND_RECORDS">;
  name: string;
  assetClass: AssetClass;
  platform: string;
  liquidity: LiquidityCategory;
  taxCategory: string;
  contextTitle: string;
};

const configs: Record<FileConnectorConfig["provider"], FileConnectorConfig> = {
  LIC: { provider: "LIC", name: "LIC", assetClass: "LIC", platform: "LIC of India", liquidity: "LOW", taxCategory: "Insurance", contextTitle: "LIC policy statement" },
  EPFO: { provider: "EPFO", name: "EPFO", assetClass: "EPF", platform: "EPFO", liquidity: "LOW", taxCategory: "Retirement", contextTitle: "EPFO passbook statement" },
  NPS: { provider: "NPS", name: "NPS CRA", assetClass: "NPS", platform: "NPS CRA", liquidity: "LOW", taxCategory: "Retirement", contextTitle: "NPS CRA statement" },
  LAND_RECORDS: { provider: "LAND_RECORDS", name: "Land / Real Estate", assetClass: "PHYSICAL_PLOT", platform: "Manual valuation", liquidity: "LOW", taxCategory: "Real Estate", contextTitle: "Land valuation record" }
};

export async function syncFileConnector(userId: string, provider: FileConnectorConfig["provider"], file: File) {
  const config = configs[provider];
  const parsed = await parseImportFile(file);
  return syncParsedRows(userId, config, parsed);
}

async function syncParsedRows(userId: string, config: FileConnectorConfig, parsed: ParsedImportFile) {
  const source = await prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: config.provider } },
    create: { userId, provider: config.provider, name: config.name, authType: "FILE_UPLOAD", status: "CONFIG_REQUIRED", metadata: { note: `${config.name} file upload parser.` } },
    update: {}
  });
  const started = new Date();
  const warnings = [...parsed.warnings];
  let importedCount = 0;
  let updatedCount = 0;

  for (const row of parsed.rows) {
    const name = connectorName(row, config);
    const currentValue = parseMoney(cell(row, ["current value", "current_value", "market value", "balance", "total", "closing balance", "surrender value", "valuation", "value"]));
    const investedAmount = parseMoney(cell(row, ["invested amount", "invested_amount", "contribution", "employee contribution", "premium paid", "cost", "amount", "purchase value"])) || currentValue;
    const units = parseMoney(cell(row, ["units", "unit balance", "quantity", "qty"]));
    const reference = cell(row, ["policy", "policy number", "uan", "pran", "survey", "plot", "account", "folio", "reference"]);

    if (!name || (!currentValue && !investedAmount)) {
      warnings.push(`Skipped ${config.name} row without name/value.`);
      continue;
    }

    const existing = await prisma.asset.findFirst({
      where: {
        userId,
        assetClass: config.assetClass,
        OR: [{ name }, ...(reference ? [{ metadata: { path: ["referenceMasked"], equals: maskLast4(reference) } }] : [])]
      }
    });

    const data = {
      name,
      platform: config.platform,
      investedAmount,
      currentValue: currentValue || investedAmount,
      units: units || undefined,
      liquidity: config.liquidity,
      taxCategory: config.taxCategory,
      metadata: {
        source: `${config.provider.toLowerCase()}_${parsed.mode}`,
        referenceMasked: maskLast4(reference),
        importedAt: new Date().toISOString()
      }
    };

    const asset = existing
      ? await prisma.asset.update({ where: { id: existing.id }, data })
      : await prisma.asset.create({ data: { userId, ownerType: "SELF", assetClass: config.assetClass, ...data } });

    if (existing) updatedCount += 1;
    else importedCount += 1;

    await prisma.advisorContextItem.create({
      data: {
        userId,
        dataSourceId: source.id,
        kind: "VALUATION_NOTE",
        title: `${name} ${config.contextTitle}`,
        source: config.name,
        asOfDate: parseDate(cell(row, ["date", "as of", "as_of_date", "valuation date"])) ?? new Date(),
        confidence: parsed.mode === "pdf" ? 0.68 : 0.82,
        staleness: parsed.mode === "pdf" ? "manual" : "fresh",
        payload: { assetId: asset.id, name, currentValue, investedAmount, referenceMasked: maskLast4(reference), decisionUse: "advisor_context_only" }
      }
    });
  }

  if (!importedCount && !updatedCount && !warnings.length) {
    warnings.push(`No ${config.name} rows imported. Detected columns: ${Object.keys(parsed.rows[0] ?? {}).join(", ") || "none"}`);
  }

  await prisma.importBatch.create({
    data: {
      userId,
      importType: importTypeForProvider(config.provider),
      fileName: parsed.fileName,
      rowCount: parsed.rows.length,
      importedCount,
      duplicateCount: 0,
      status: warnings.length && !importedCount && !updatedCount ? "NEEDS_REVIEW" : "IMPORTED",
      mapping: { mode: parsed.mode, warnings }
    }
  });
  await prisma.syncRun.create({
    data: {
      userId,
      dataSourceId: source.id,
      provider: config.provider,
      status: warnings.length && !importedCount && !updatedCount ? "ERROR" : "SYNCED",
      importedCount,
      updatedCount,
      warningCount: warnings.length,
      warnings,
      startedAt: started,
      completedAt: new Date()
    }
  });
  await prisma.dataSource.update({ where: { id: source.id }, data: { status: warnings.length && !importedCount && !updatedCount ? "ERROR" : "SYNCED", lastSyncAt: new Date(), metadata: { mode: parsed.mode, note: `${config.name} file upload.` } } });
  return { importedCount, updatedCount, warnings };
}

function connectorName(row: Record<string, string>, config: FileConnectorConfig) {
  return cell(row, ["name", "scheme", "policy name", "fund", "description", "particulars", "property", "plot", "location"]) || config.contextTitle;
}

function importTypeForProvider(provider: FileConnectorConfig["provider"]) {
  if (provider === "NPS") return "NPS";
  if (provider === "EPFO") return "EPF";
  return "GENERIC_CSV";
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

function maskLast4(value?: string) {
  if (!value) return undefined;
  return `****${value.slice(-4)}`;
}

function parseDate(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
