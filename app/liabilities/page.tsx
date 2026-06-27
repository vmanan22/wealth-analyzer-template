import { createLiability } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { formatRupees, toNumber } from "@/lib/format";

export default async function LiabilitiesPage() {
  const { liabilities } = await getPortfolioData();
  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Liabilities" eyebrow="Loans and obligations" />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.8fr]">
        <Card>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Name</th><th>Lender</th><th>Class</th><th>Outstanding</th><th>EMI</th><th>Rate</th><th>Tenure</th></tr>
              </thead>
              <tbody>
                {liabilities.map((liability) => (
                  <tr key={liability.id}>
                    <td className="font-semibold">{liability.name}</td>
                    <td>{liability.lender}</td>
                    <td>{liability.liabilityClass.replace("_", " ")}</td>
                    <td>{formatRupees(toNumber(liability.outstandingAmount), { compact: true })}</td>
                    <td>{formatRupees(toNumber(liability.emi), { compact: true })}</td>
                    <td>{liability.interestRate?.toString() ?? "-"}%</td>
                    <td>{liability.remainingTenureMonths ?? "-"} mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">Add Liability</h2>
          <form action={createLiability} className="grid gap-3">
            <input name="name" required placeholder="Home Loan" />
            <select name="ownerType"><option>SELF</option><option>SPOUSE</option><option>FAMILY</option></select>
            <select name="liabilityClass"><option>HOME_LOAN</option><option>PERSONAL_LOAN</option><option>CREDIT_CARD</option><option>CAR_LOAN</option><option>OTHER</option></select>
            <input name="lender" required placeholder="HDFC Bank" />
            <input name="originalAmount" type="number" required placeholder="Original loan amount" />
            <input name="outstandingAmount" type="number" required placeholder="Outstanding amount" />
            <input name="emi" type="number" placeholder="EMI" />
            <input name="interestRate" type="number" step="0.001" placeholder="Interest rate" />
            <input name="remainingTenureMonths" type="number" placeholder="Remaining tenure months" />
            <textarea name="notes" rows={3} placeholder="Notes" />
            <PrimaryButton>Save liability</PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
