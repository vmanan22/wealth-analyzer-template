import { createAsset } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { assetClassOptions } from "@/lib/asset-options";

export default function AddAssetPage() {
  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Add Asset" eyebrow="Manual entry" />
      <Card>
        <form action={createAsset} className="grid gap-4 md:grid-cols-2">
          <Field label="Name"><input name="name" required placeholder="Parag Parikh Flexi Cap Fund" /></Field>
          <Field label="Owner"><select name="ownerType" defaultValue="SELF"><option>SELF</option><option>SPOUSE</option><option>FAMILY</option></select></Field>
          <Field label="Asset class">
            <select name="assetClass" defaultValue="MUTUAL_FUND">
              {assetClassOptions.map((item) => (
                <option key={item.value} value={item.value}>{item.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Institution / platform"><input name="platform" placeholder="Kuvera, Zerodha, HDFC Bank" /></Field>
          <Field label="Invested amount"><input name="investedAmount" type="number" min="0" step="0.01" required /></Field>
          <Field label="Current value"><input name="currentValue" type="number" min="0" step="0.01" required /></Field>
          <Field label="Units / quantity"><input name="units" type="number" min="0" step="0.000001" /></Field>
          <Field label="Current NAV / price"><input name="currentPrice" type="number" min="0" step="0.0001" /></Field>
          <Field label="Monthly SIP / contribution"><input name="sipAmount" type="number" min="0" step="0.01" /></Field>
          <Field label="Liquidity"><select name="liquidity" defaultValue="MEDIUM"><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
          <Field label="Purchase date"><input name="purchaseDate" type="date" /></Field>
          <Field label="Contribution date"><input name="contributionDate" type="date" /></Field>
          <Field label="Tax category"><input name="taxCategory" placeholder="Equity MF, Retirement, Real Estate" /></Field>
          <Field label="Tags"><input name="tags" placeholder="equity, tax-saving" /></Field>
          <div className="md:col-span-2">
            <Field label="Notes"><textarea name="notes" rows={4} /></Field>
          </div>
          <div className="md:col-span-2"><PrimaryButton>Save asset</PrimaryButton></div>
        </form>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label>{label}</label>{children}</div>;
}
