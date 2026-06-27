import { createMonthlySnapshot } from "@/app/actions";
import { AssetClassArea, NetWorthLine } from "@/components/charts";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { formatRupees } from "@/lib/format";

export default async function SnapshotsPage() {
  const { netWorthTrend, assetClassHistory } = await getPortfolioData();
  const latest = netWorthTrend.at(-1);

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Historical Snapshots" eyebrow="Monthly wealth tracking">
        <form action={createMonthlySnapshot}>
          <PrimaryButton>Create this month&apos;s snapshot</PrimaryButton>
        </form>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="text-lg font-bold">Net Worth Over Time</h2>
          <NetWorthLine data={netWorthTrend} />
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Latest Snapshot</h2>
          {latest ? (
            <div className="mt-4 space-y-4">
              <Row label="Month" value={latest.month} />
              <Row label="Assets" value={formatRupees(latest.assets, { compact: true })} />
              <Row label="Liabilities" value={formatRupees(latest.liabilities, { compact: true })} />
              <Row label="Net worth" value={formatRupees(latest.netWorth, { compact: true })} />
              <Row label="XIRR placeholder" value="Future enhancement" />
            </div>
          ) : null}
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-bold">Asset Class Growth</h2>
        <AssetClassArea data={assetClassHistory} />
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3 text-sm"><span className="text-stone-500">{label}</span><span className="font-bold">{value}</span></div>;
}
