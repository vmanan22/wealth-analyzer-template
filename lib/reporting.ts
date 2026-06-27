import { endOfMonth, startOfMonth } from "date-fns";
import { getPortfolioData } from "@/lib/data";
import { formatRupees, toNumber } from "@/lib/format";

export async function buildMonthlyReportContent(aiInsight?: { id: string; recommendationsJson: unknown; riskScore: number | null; createdAt: Date } | null) {
  const portfolio = await getPortfolioData();
  const now = new Date();
  const monthlyCommitments =
    portfolio.assets.reduce((sum, asset) => sum + toNumber(asset.sipAmount), 0) +
    portfolio.liabilities.reduce((sum, liability) => sum + toNumber(liability.emi), 0);

  return {
    periodStart: startOfMonth(now),
    periodEnd: endOfMonth(now),
    content: {
      title: "Monthly Wealth Report",
      generatedAt: now.toISOString(),
      summary: {
        netWorth: portfolio.summary.netWorth,
        totalAssets: portfolio.summary.totalAssets,
        totalLiabilities: portfolio.summary.totalLiabilities,
        monthlyCommitments,
        debtToAssetRatio: portfolio.summary.debtToAssetRatio,
        liquidAssets: portfolio.summary.liquidAssets,
        illiquidAssets: portfolio.summary.illiquidAssets
      },
      highlights: [
        `Net worth: ${formatRupees(portfolio.summary.netWorth, { compact: true })}`,
        `Assets: ${formatRupees(portfolio.summary.totalAssets, { compact: true })}`,
        `Liabilities: ${formatRupees(portfolio.summary.totalLiabilities, { compact: true })}`,
        `Monthly commitments: ${formatRupees(monthlyCommitments, { compact: true })}`
      ],
      allocation: portfolio.allocation,
      goals: portfolio.goals.map((goal) => ({
        name: goal.name,
        targetAmount: toNumber(goal.targetAmount),
        progressPercent: portfolio.summary.netWorth ? Math.min(100, (portfolio.summary.netWorth / toNumber(goal.targetAmount)) * 100) : 0
      })),
      topMovers: portfolio.gainers.slice(0, 5),
      aiInsight: aiInsight ? {
        id: aiInsight.id,
        recommendationsJson: aiInsight.recommendationsJson,
        riskScore: aiInsight.riskScore,
        createdAt: aiInsight.createdAt.toISOString()
      } : null
    }
  };
}
