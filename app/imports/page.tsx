import { importGenericCsv } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";

export default async function ImportsPage() {
  const { imports } = await getPortfolioData();

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Imports" eyebrow="CSV and Excel-ready ingestion" />
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1fr]">
        <Card>
          <h2 className="text-lg font-bold">Generic CSV Import</h2>
          <p className="mt-1 text-sm text-stone-500">
            Upload Kuvera, Zerodha, bank, EPF, NPS, LIC, gold, or real estate exports after mapping the important columns.
          </p>
          <form action={importGenericCsv} className="mt-5 grid gap-3">
            <input name="file" type="file" accept=".csv,text/csv" required />
            <div className="grid gap-3 sm:grid-cols-2">
              <input name="nameColumn" defaultValue="name" placeholder="Asset name column" />
              <input name="amountColumn" defaultValue="invested_amount" placeholder="Invested amount column" />
              <input name="currentValueColumn" defaultValue="current_value" placeholder="Current value column" />
              <input name="dateColumn" defaultValue="transaction_date" placeholder="Date column" />
            </div>
            <div className="rounded-md bg-stone-50 p-3 text-sm text-stone-600">
              Duplicate protection uses a hash of transaction date, asset name, and amount. Future connectors are intentionally left as service interfaces/TODOs, not live paid APIs.
            </div>
            <PrimaryButton>Import CSV</PrimaryButton>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold">Import History</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Type</th>
                  <th>Rows</th>
                  <th>Imported</th>
                  <th>Duplicates</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {imports.map((batch) => (
                  <tr key={batch.id}>
                    <td className="font-semibold">{batch.fileName}</td>
                    <td>{batch.importType}</td>
                    <td>{batch.rowCount}</td>
                    <td>{batch.importedCount}</td>
                    <td>{batch.duplicateCount}</td>
                    <td>{batch.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {["Kuvera / CAS", "Zerodha Holdings", "Bank Statement", "EPF / NPS"].map((name) => (
          <Card key={name}>
            <h3 className="font-bold">{name}</h3>
            <p className="mt-2 text-sm text-stone-500">Parser placeholder ready for a dedicated mapper in the next integration phase.</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
