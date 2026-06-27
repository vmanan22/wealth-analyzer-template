import { Asset, AssetClass, Liability } from "@prisma/client";
import { toNumber } from "@/lib/format";

export type AssetWithNumbers = Asset & {
  investedAmount: unknown;
  currentValue: unknown;
  sipAmount: unknown;
};

export function summarizePortfolio(assets: AssetWithNumbers[], liabilities: Liability[]) {
  const totalAssets = assets.reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);
  const invested = assets.reduce((sum, asset) => sum + toNumber(asset.investedAmount), 0);
  const totalLiabilities = liabilities.reduce((sum, liability) => sum + toNumber(liability.outstandingAmount), 0);
  const monthlyContributions = assets.reduce((sum, asset) => sum + toNumber(asset.sipAmount), 0);
  const liquidAssets = assets
    .filter((asset) => asset.liquidity === "HIGH")
    .reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);
  const illiquidAssets = assets
    .filter((asset) => asset.liquidity === "LOW")
    .reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);

  return {
    totalAssets,
    invested,
    totalLiabilities,
    netWorth: totalAssets - totalLiabilities,
    monthlyContributions,
    liquidAssets,
    illiquidAssets,
    debtToAssetRatio: totalAssets ? (totalLiabilities / totalAssets) * 100 : 0,
    absoluteReturn: invested ? ((totalAssets - invested) / invested) * 100 : 0
  };
}

export function assetAllocation(assets: AssetWithNumbers[]) {
  const grouped = new Map<AssetClass, number>();
  for (const asset of assets) {
    grouped.set(asset.assetClass, (grouped.get(asset.assetClass) ?? 0) + toNumber(asset.currentValue));
  }
  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

export function ownerAllocation(assets: AssetWithNumbers[]) {
  const grouped = new Map<string, number>();
  for (const asset of assets) {
    grouped.set(asset.ownerType, (grouped.get(asset.ownerType) ?? 0) + toNumber(asset.currentValue));
  }
  return Array.from(grouped.entries()).map(([name, value]) => ({ name, value }));
}

export function gainersAndLaggards(assets: AssetWithNumbers[]) {
  return [...assets]
    .map((asset) => {
      const invested = toNumber(asset.investedAmount);
      const current = toNumber(asset.currentValue);
      return {
        id: asset.id,
        name: asset.name,
        assetClass: asset.assetClass,
        gain: current - invested,
        gainPercent: invested ? ((current - invested) / invested) * 100 : 0
      };
    })
    .sort((a, b) => b.gainPercent - a.gainPercent);
}
