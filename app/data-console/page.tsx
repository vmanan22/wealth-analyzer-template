import { addNseLicensedFeedWarning, importCasHoldings, importZerodhaHoldings, initializeDataConsole } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getDataConsoleData } from "@/lib/data-console";

const connectorLabels: Record<string, string> = {
  ZERODHA: "Zerodha",
  CAS: "CAS / CAMS / KFintech / MFCentral",
  NSE: "NSE Market Context",
  LIC: "LIC",
  EPFO: "EPFO",
  NPS: "NPS",
  LAND_RECORDS: "Land / Real Estate",
  ACCOUNT_AGGREGATOR: "Account Aggregator",
  MANUAL: "Manual"
};

export default async function DataConsolePage() {
  const { sources, syncRuns, contextItems } = await getDataConsoleData();

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Data Console" eyebrow="External feeds and advisor context">
        <form action={initializeDataConsole}><PrimaryButton>Refresh connectors</PrimaryButton></form>
      </PageHeader>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <h2 className="text-lg font-bold">Connectors</h2>
          <div className="mt-4 grid gap-3">
            {sources.map((source) => (
              <div key={source.id} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{connectorLabels[source.provider] ?? source.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">{source.authType} · {source.status}</p>
                  </div>
                  <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-stone-600">{source.lastSyncAt ? source.lastSyncAt.toLocaleDateString("en-IN") : "Not synced"}</span>
                </div>
                <p className="mt-2 text-sm text-stone-500">{String((source.metadata as { note?: string } | null)?.note ?? "")}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card>
            <h2 className="text-lg font-bold">First Tranche Imports</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <form action={importZerodhaHoldings} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <p className="font-bold">Zerodha holdings CSV</p>
                <p className="mt-1 text-sm text-stone-500">Maps holdings into stock/ETF assets and advisor holding facts. Kite Connect OAuth can replace CSV later.</p>
                <input className="mt-3" name="file" type="file" accept=".csv,text/csv" required />
                <button className="mt-3 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white">Import Zerodha</button>
              </form>
              <form action={importCasHoldings} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <p className="font-bold">CAS mutual fund CSV</p>
                <p className="mt-1 text-sm text-stone-500">Maps CAS/CAMS/KFintech/MFCentral exports into MF assets and advisor facts.</p>
                <input className="mt-3" name="file" type="file" accept=".csv,text/csv" required />
                <button className="mt-3 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white">Import CAS</button>
              </form>
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold">NSE Market Context</h2>
            <p className="mt-2 text-sm text-stone-500">Production market feeds should use permitted APIs, licensed vendors, or broker APIs. This app does not scrape NSE pages.</p>
            <form action={addNseLicensedFeedWarning} className="mt-4">
              <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-ink">Add licensed-feed warning to AI context</button>
            </form>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card>
          <h2 className="mb-4 text-lg font-bold">Advisor Context Feed</h2>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr><th>Fact</th><th>Kind</th><th>Source</th><th>As of</th><th>Confidence</th><th>Staleness</th></tr>
              </thead>
              <tbody>
                {contextItems.map((item) => (
                  <tr key={item.id}>
                    <td className="font-semibold">{item.title}</td>
                    <td>{item.kind.replaceAll("_", " ")}</td>
                    <td>{item.source}</td>
                    <td>{item.asOfDate.toLocaleDateString("en-IN")}</td>
                    <td>{Number(item.confidence).toFixed(2)}</td>
                    <td>{item.staleness}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">Recent Sync Runs</h2>
          <div className="grid gap-3">
            {syncRuns.map((run) => (
              <div key={run.id} className="rounded-md bg-stone-50 p-3 text-sm">
                <div className="flex justify-between gap-3"><span className="font-semibold">{connectorLabels[run.provider] ?? run.provider}</span><span>{run.status}</span></div>
                <p className="mt-1 text-stone-500">{run.importedCount} imported · {run.updatedCount} updated · {run.warningCount} warnings</p>
                {run.errorMessage ? <p className="mt-1 text-coral">{run.errorMessage}</p> : null}
              </div>
            ))}
            {!syncRuns.length ? <p className="text-sm text-stone-500">No sync runs yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
