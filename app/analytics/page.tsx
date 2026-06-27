import { AllocationPie } from "@/components/charts";
import { Card, PageHeader, StatCard } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { formatRupees, percent, toNumber } from "@/lib/format";

export default async function AnalyticsPage() {
  const { summary, allocation, ownerAllocation, liabilities, assets } = await getPortfolioData();
  const bankCash = assets.filter((asset) => ["BANK", "SAVINGS", "FIXED_DEPOSIT", "RECURRING_DEPOSIT"].includes(asset.assetClass)).reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);
  const monthlyEmi = liabilities.reduce((sum, liability) => sum + toNumber(liability.emi), 0);
  const emergencyMonths = monthlyEmi ? bankCash / monthlyEmi : 0;
  const realEstate = assets.filter((asset) => ["REAL_ESTATE", "PHYSICAL_PLOT"].includes(asset.assetClass)).reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);
  const gold = assets.filter((asset) => ["GOLD", "SGB", "DIGITAL_GOLD", "GOLD_ETF"].includes(asset.assetClass)).reduce((sum, asset) => sum + toNumber(asset.currentValue), 0);

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Analytics" eyebrow="Insights for the household" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Financial independence progress" value={percent((summary.netWorth / 50000000) * 100)} helper="Against ₹5Cr milestone" />
        <StatCard label="Emergency fund months" value={emergencyMonths.toFixed(1)} helper="Bank cash divided by EMI burden" />
        <StatCard label="Illiquid percentage" value={percent(summary.totalAssets ? (summary.illiquidAssets / summary.totalAssets) * 100 : 0)} helper="Real estate, EPF, LIC, locked assets" />
        <StatCard label="Loan burden" value={formatRupees(monthlyEmi, { compact: true })} helper="Monthly EMI outflow" tone="warn" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Card>
          <h2 className="text-lg font-bold">Equity / Debt / Gold / Real Estate</h2>
          <AllocationPie data={allocation} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Owner-Level View</h2>
          <AllocationPie data={ownerAllocation} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Concentration Risk</h2>
          <div className="mt-4 space-y-4">
            <Risk label="Real estate concentration" value={percent(summary.totalAssets ? (realEstate / summary.totalAssets) * 100 : 0)} />
            <Risk label="Gold allocation" value={percent(summary.totalAssets ? (gold / summary.totalAssets) * 100 : 0)} />
            <Risk label="Debt-to-asset ratio" value={percent(summary.debtToAssetRatio)} />
            <Risk label="Liquid asset coverage" value={percent(summary.totalAssets ? (summary.liquidAssets / summary.totalAssets) * 100 : 0)} />
            <Risk label="Retirement corpus estimate" value="Projected module TODO" />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Risk({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3 text-sm"><span className="text-stone-600">{label}</span><span className="font-bold">{value}</span></div>;
}
