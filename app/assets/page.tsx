import Link from "next/link";
import { Plus } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { assetClassOptions, formatAssetClass } from "@/lib/asset-options";
import { formatRupees, percent, toNumber } from "@/lib/format";

export default async function AssetsPage() {
  const { assets } = await getPortfolioData();

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Assets" eyebrow="Investments, savings, physical assets">
        <Link className="inline-flex items-center gap-2 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white" href="/assets/add">
          <Plus size={16} /> Add asset
        </Link>
      </PageHeader>
      <Card>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <select><option>All owners</option><option>SELF</option><option>SPOUSE</option><option>FAMILY</option></select>
          <select>
            <option>All asset classes</option>
            {assetClassOptions.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
          <input placeholder="Institution" />
          <select><option>All liquidity</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select>
          <input placeholder="Tax category" />
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Owner</th>
                <th>Class</th>
                <th>Platform</th>
                <th>Invested</th>
                <th>Value</th>
                <th>Return</th>
                <th>Liquidity</th>
              </tr>
            </thead>
            <tbody>
              {assets.map((asset) => {
                const invested = toNumber(asset.investedAmount);
                const current = toNumber(asset.currentValue);
                return (
                  <tr key={asset.id}>
                    <td className="font-semibold">{asset.name}</td>
                    <td>{asset.ownerType}</td>
                    <td>{formatAssetClass(asset.assetClass)}</td>
                    <td>{asset.platform ?? asset.institution?.name ?? "-"}</td>
                    <td>{formatRupees(invested, { compact: true })}</td>
                    <td>{formatRupees(current, { compact: true })}</td>
                    <td className={current >= invested ? "font-semibold text-leaf" : "font-semibold text-coral"}>{percent(invested ? ((current - invested) / invested) * 100 : 0)}</td>
                    <td>{asset.liquidity}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
