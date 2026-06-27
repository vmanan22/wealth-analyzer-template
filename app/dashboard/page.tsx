import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";
import { AllocationPie, GoalBars, NetWorthLine } from "@/components/charts";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { formatAssetClass } from "@/lib/asset-options";
import { formatRupees, percent, toNumber } from "@/lib/format";

export default async function DashboardPage() {
  const { summary, allocation, netWorthTrend, goals, gainers, assets, liabilities } = await getPortfolioData();
  const monthlySipAssets = assets.filter((asset) => asset.assetClass === "MUTUAL_FUND" && toNumber(asset.sipAmount) > 0);
  const monthlySipTotal = monthlySipAssets.reduce((sum, asset) => sum + toNumber(asset.sipAmount), 0);
  const monthlyLicPremium = assets
    .filter((asset) => asset.assetClass === "LIC")
    .reduce((sum, asset) => sum + toNumber(asset.sipAmount), 0);
  const monthlyHomeLoanEmi = liabilities
    .filter((liability) => liability.liabilityClass === "HOME_LOAN")
    .reduce((sum, liability) => sum + toNumber(liability.emi), 0);
  const monthlyOtherInvestments = assets
    .filter((asset) => !["MUTUAL_FUND", "LIC"].includes(asset.assetClass))
    .reduce((sum, asset) => sum + toNumber(asset.sipAmount), 0);
  const monthlyOutflowTotal = monthlySipTotal + monthlyLicPremium + monthlyHomeLoanEmi + monthlyOtherInvestments;
  const goalData = goals.slice(0, 6).map((goal) => ({
    name: goal.name.replace(" Net Worth", ""),
    progress: Math.min(100, (summary.netWorth / toNumber(goal.targetAmount)) * 100)
  }));

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Family Wealth Dashboard" eyebrow="Personal balance sheet">
        <div className="flex gap-2">
          <Link className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-ink" href="/assets/add">
            <Plus size={16} /> Add asset
          </Link>
          <Link className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold" href="/imports">
            Import CSV <ArrowUpRight size={16} />
          </Link>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Net worth" value={formatRupees(summary.netWorth, { compact: true })} helper={formatRupees(summary.netWorth)} tone="good" />
        <StatCard label="Total assets" value={formatRupees(summary.totalAssets, { compact: true })} helper={`${assets.length} tracked assets`} />
        <StatCard label="Total liabilities" value={formatRupees(summary.totalLiabilities, { compact: true })} helper={`${liabilities.length} active liability`} tone="bad" />
        <StatCard
          label="Monthly commitments"
          value={formatRupees(monthlyOutflowTotal, { compact: true })}
          helper={`${monthlySipAssets.length} SIPs, home loan, LIC, and other investments`}
        />
      </div>

      <Card className="mt-6">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Monthly SIP / Contribution Breakdown</h2>
            <p className="text-sm text-stone-500">Recurring investment and liability commitments tracked from the portfolio</p>
          </div>
          <p className="text-2xl font-bold text-leaf">{formatRupees(monthlyOutflowTotal, { compact: true })}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <CommitmentTile
            label="Mutual fund SIPs"
            value={formatRupees(monthlySipTotal, { compact: true })}
            helper={`${monthlySipAssets.length} active SIP${monthlySipAssets.length === 1 ? "" : "s"}`}
          />
          <CommitmentTile
            label="Home loan EMI"
            value={formatRupees(monthlyHomeLoanEmi, { compact: true })}
            helper={`${liabilities.filter((liability) => liability.liabilityClass === "HOME_LOAN").length} home loan${liabilities.filter((liability) => liability.liabilityClass === "HOME_LOAN").length === 1 ? "" : "s"}`}
            tone="bad"
          />
          <CommitmentTile
            label="LIC premium"
            value={formatRupees(monthlyLicPremium, { compact: true })}
            helper={`${assets.filter((asset) => asset.assetClass === "LIC" && toNumber(asset.sipAmount) > 0).length} policy premium${assets.filter((asset) => asset.assetClass === "LIC" && toNumber(asset.sipAmount) > 0).length === 1 ? "" : "s"}`}
            tone="warn"
          />
          <CommitmentTile
            label="Other investments"
            value={formatRupees(monthlyOtherInvestments, { compact: true })}
            helper="EPF, NPS, PPF, and other recurring entries"
          />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Monthly item</th>
                <th>Type</th>
                <th>Owner</th>
                <th>Monthly amount</th>
              </tr>
            </thead>
            <tbody>
              {assets.filter((asset) => toNumber(asset.sipAmount) > 0).map((asset) => (
                <tr key={asset.id}>
                  <td className="font-semibold">{asset.name}</td>
                  <td>{formatAssetClass(asset.assetClass)}</td>
                  <td>{asset.ownerType}</td>
                  <td>{formatRupees(toNumber(asset.sipAmount), { compact: true })}</td>
                </tr>
              ))}
              {liabilities.filter((liability) => toNumber(liability.emi) > 0).map((liability) => (
                <tr key={liability.id}>
                  <td className="font-semibold">{liability.name}</td>
                  <td>{liability.liabilityClass.replace("_", " ")}</td>
                  <td>{liability.ownerType}</td>
                  <td>{formatRupees(toNumber(liability.emi), { compact: true })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Net Worth Trend</h2>
              <p className="text-sm text-stone-500">Monthly snapshots across assets and liabilities</p>
            </div>
            <span className="rounded-md bg-mint px-3 py-1 text-sm font-semibold text-leaf">MoM ready</span>
          </div>
          <NetWorthLine data={netWorthTrend} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Asset Allocation</h2>
          <p className="text-sm text-stone-500">Full household view by asset class</p>
          <AllocationPie data={allocation} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-bold">Goal Progress</h2>
          <GoalBars data={goalData} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Risk and Liquidity</h2>
          <div className="mt-4 space-y-4">
            <Metric label="Debt-to-asset ratio" value={percent(summary.debtToAssetRatio)} />
            <Metric label="Liquid net worth" value={formatRupees(summary.liquidAssets, { compact: true })} />
            <Metric label="Illiquid assets" value={formatRupees(summary.illiquidAssets, { compact: true })} />
            <Metric label="Absolute return placeholder" value={percent(summary.absoluteReturn)} />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Top Gainers / Laggards</h2>
          <div className="mt-4 space-y-3">
            {gainers.slice(0, 5).map((asset) => (
              <div key={asset.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{asset.name}</p>
                  <p className="text-xs text-stone-500">{formatAssetClass(asset.assetClass)}</p>
                </div>
                <span className={asset.gainPercent >= 0 ? "text-sm font-bold text-leaf" : "text-sm font-bold text-coral"}>{percent(asset.gainPercent)}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <h2 className="mb-4 text-lg font-bold">Asset Class Summary</h2>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Asset</th>
                <th>Owner</th>
                <th>Class</th>
                <th>Invested</th>
                <th>Current value</th>
                <th>Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => (
                <tr key={asset.id}>
                  <td className="font-semibold">{asset.name}</td>
                  <td>{asset.ownerType}</td>
                  <td>{formatAssetClass(asset.assetClass)}</td>
                  <td>{formatRupees(toNumber(asset.investedAmount), { compact: true })}</td>
                  <td>{formatRupees(toNumber(asset.currentValue), { compact: true })}</td>
                  <td>{asset.liquidity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-stone-50 px-3 py-3">
      <span className="text-sm text-stone-600">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  );
}

function CommitmentTile({ label, value, helper, tone = "default" }: { label: string; value: string; helper: string; tone?: "default" | "warn" | "bad" }) {
  const valueClass = {
    default: "text-ink",
    warn: "text-amber",
    bad: "text-coral"
  }[tone];

  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-1 text-xs text-stone-500">{helper}</p>
    </div>
  );
}
