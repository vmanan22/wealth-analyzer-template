import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { assetAllocation, gainersAndLaggards, ownerAllocation, summarizePortfolio } from "@/lib/analytics";
import { formatAssetClass } from "@/lib/asset-options";
import { toNumber } from "@/lib/format";

export async function getPortfolioData() {
  const userId = await requireUserId();
  const [assets, liabilities, goals, imports, assetSnapshots, liabilitySnapshots] = await Promise.all([
    prisma.asset.findMany({ where: { userId }, include: { institution: true, owner: true }, orderBy: { updatedAt: "desc" } }),
    prisma.liability.findMany({ where: { userId }, include: { institution: true, owner: true }, orderBy: { updatedAt: "desc" } }),
    prisma.goal.findMany({ where: { userId }, orderBy: { targetAmount: "asc" } }),
    prisma.importBatch.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 8 }),
    prisma.assetSnapshot.findMany({ where: { asset: { userId } }, include: { asset: true }, orderBy: { snapshotDate: "asc" } }),
    prisma.liabilitySnapshot.findMany({ where: { liability: { userId } }, orderBy: { snapshotDate: "asc" } })
  ]);

  const summary = summarizePortfolio(assets, liabilities);
  const snapshotMonths = new Map<string, { month: string; assets: number; liabilities: number; netWorth: number }>();

  for (const snapshot of assetSnapshots) {
    const month = format(snapshot.snapshotDate, "MMM yy");
    const row = snapshotMonths.get(month) ?? { month, assets: 0, liabilities: 0, netWorth: 0 };
    row.assets += toNumber(snapshot.currentValue);
    snapshotMonths.set(month, row);
  }

  for (const snapshot of liabilitySnapshots) {
    const month = format(snapshot.snapshotDate, "MMM yy");
    const row = snapshotMonths.get(month) ?? { month, assets: 0, liabilities: 0, netWorth: 0 };
    row.liabilities += toNumber(snapshot.outstandingAmount);
    snapshotMonths.set(month, row);
  }

  const netWorthTrend = Array.from(snapshotMonths.values()).map((row) => ({
    ...row,
    netWorth: row.assets - row.liabilities
  }));

  const assetClassHistoryMap = new Map<string, Record<string, string | number>>();
  for (const snapshot of assetSnapshots) {
    const month = format(snapshot.snapshotDate, "MMM yy");
    const row = assetClassHistoryMap.get(month) ?? { month };
    const key = formatAssetClass(snapshot.asset.assetClass);
    row[key] = Number(row[key] ?? 0) + toNumber(snapshot.currentValue);
    assetClassHistoryMap.set(month, row);
  }

  return {
    userId,
    assets,
    liabilities,
    goals,
    imports,
    summary,
    allocation: assetAllocation(assets),
    ownerAllocation: ownerAllocation(assets),
    gainers: gainersAndLaggards(assets),
    netWorthTrend,
    assetClassHistory: Array.from(assetClassHistoryMap.values())
  };
}

export async function getReferenceData() {
  const [owners, institutions] = await Promise.all([
    prisma.owner.findMany({ orderBy: { name: "asc" } }),
    prisma.institution.findMany({ orderBy: { name: "asc" } })
  ]);
  return { owners, institutions };
}
