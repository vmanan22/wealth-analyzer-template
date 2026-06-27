import { DataSourceProvider, DataSourceStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";

const defaultConnectors: { provider: DataSourceProvider; name: string; authType: "OAUTH" | "FILE_UPLOAD" | "LICENSED_FEED" | "MANUAL" | "CONSENT"; status: DataSourceStatus; note: string }[] = [
  { provider: "ZERODHA", name: "Zerodha", authType: "OAUTH", status: "CONFIG_REQUIRED", note: "Use Kite Connect OAuth/API tokens for holdings and permitted quotes." },
  { provider: "CAS", name: "CAS / CAMS / KFintech / MFCentral", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", note: "Upload CAS exports; no Kuvera credentials required." },
  { provider: "NSE", name: "NSE Market Context", authType: "LICENSED_FEED", status: "CONFIG_REQUIRED", note: "Do not scrape NSE pages; use licensed/publicly permitted market data." },
  { provider: "LIC", name: "LIC", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", note: "Manual or statement upload first. Never store LIC credentials." },
  { provider: "EPFO", name: "EPFO", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", note: "Manual/passbook import only. No EPFO website scraping." },
  { provider: "NPS", name: "NPS CRA", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", note: "Manual/CRA statement import." },
  { provider: "LAND_RECORDS", name: "Land / Real Estate", authType: "MANUAL", status: "NOT_CONNECTED", note: "Use manual valuation, appraisal, circle rate, and valuation history." },
  { provider: "ACCOUNT_AGGREGATOR", name: "Account Aggregator", authType: "CONSENT", status: "CONFIG_REQUIRED", note: "Future RBI-regulated consent flow for financial accounts." }
];

export async function ensureDefaultDataSources(userId: string) {
  for (const connector of defaultConnectors) {
    await prisma.dataSource.upsert({
      where: { userId_provider: { userId, provider: connector.provider } },
      create: { userId, provider: connector.provider, name: connector.name, authType: connector.authType, status: connector.status, metadata: { note: connector.note } },
      update: { name: connector.name, authType: connector.authType, metadata: { note: connector.note } }
    });
  }
}

export async function getDataConsoleData() {
  const userId = await requireUserId();
  await ensureDefaultDataSources(userId);
  const [sources, syncRuns, contextItems] = await Promise.all([
    prisma.dataSource.findMany({ where: { userId }, orderBy: { provider: "asc" } }),
    prisma.syncRun.findMany({ where: { userId }, orderBy: { startedAt: "desc" }, take: 12 }),
    prisma.advisorContextItem.findMany({ where: { userId }, orderBy: { asOfDate: "desc" }, take: 50 })
  ]);
  return { userId, sources, syncRuns, contextItems };
}
