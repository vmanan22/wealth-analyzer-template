import { addMarketIntelContext, addNseLicensedFeedWarning, importCasHoldings, importEpfoStatement, importLandValuation, importLicStatement, importNpsStatement, importZerodhaHoldings, initializeDataConsole } from "@/app/actions";
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

const fileAccept = ".csv,.xlsx,.xls,.pdf,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

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
              <ConnectorUploadCard title="Zerodha holdings" action={importZerodhaHoldings} button="Import Zerodha" description="Maps holdings into stock/ETF assets and advisor holding facts. Kite Connect OAuth can replace file uploads later." helper="Supported columns include Instrument/Tradingsymbol, Qty., Avg. cost, LTP, Cur. val, ISIN, Exchange." />
              <ConnectorUploadCard title="CAS mutual funds" action={importCasHoldings} button="Import CAS" description="Maps CAS/CAMS/KFintech/MFCentral exports into MF assets and advisor facts." helper="Use CAS, CAMS, KFintech, or MFCentral exports when available." />
              <ConnectorUploadCard title="LIC policy statement" action={importLicStatement} button="Import LIC" description="Maps LIC policies into insurance assets and advisor valuation notes." helper="Best columns: policy name/number, premium paid, surrender/current value, maturity value." />
              <ConnectorUploadCard title="EPFO passbook" action={importEpfoStatement} button="Import EPFO" description="Maps EPF balances into retirement assets and advisor context." helper="Best columns: description/name, employee/employer contribution, balance, closing balance." />
              <ConnectorUploadCard title="NPS CRA statement" action={importNpsStatement} button="Import NPS" description="Maps NPS Tier balances into retirement assets and advisor context." helper="Best columns: scheme/fund, units, NAV, current value, PRAN/reference." />
              <ConnectorUploadCard title="Land / real estate valuation" action={importLandValuation} button="Import Land" description="Maps land/property valuation files into physical plot assets." helper="Best columns: property/plot/location, valuation/current value, cost, valuation date." />
            </div>
          </Card>

          <Card>
            <h2 className="text-lg font-bold">NSE Market Context</h2>
            <p className="mt-2 text-sm text-stone-500">Production market feeds should use permitted APIs, licensed vendors, or broker APIs. This app does not scrape NSE pages.</p>
            <form action={addNseLicensedFeedWarning} className="mt-4">
              <button className="rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-ink">Add licensed-feed warning to AI context</button>
            </form>
          </Card>

          <Card>
            <h2 className="text-lg font-bold">Manual Market Intel</h2>
            <p className="mt-2 text-sm text-stone-500">Add trusted NSE/BSE, SEBI, RBI, AMFI, broker, vendor, or news context for the AI Advisor. Do not paste secrets or account data.</p>
            <form action={addMarketIntelContext} className="mt-4 grid gap-3">
              <input name="title" placeholder="Headline or fact" required />
              <div className="grid gap-3 md:grid-cols-2">
                <input name="sourceName" placeholder="Source name, e.g. NSE circular" required />
                <input name="sourceType" placeholder="Source type, e.g. exchange / news / vendor" />
              </div>
              <textarea name="summary" rows={4} placeholder="Short summary for advisor context" required />
              <div className="grid gap-3 md:grid-cols-3">
                <input name="tags" placeholder="Tags: NIFTY, Banking, MF" />
                <input name="url" placeholder="Reference URL" />
                <input name="asOfDate" type="date" />
              </div>
              <button className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white">Add market intel</button>
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

function ConnectorUploadCard({ title, description, helper, action, button }: { title: string; description: string; helper: string; action: (formData: FormData) => void | Promise<void>; button: string }) {
  return (
    <form action={action} className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="font-bold">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{description}</p>
      <p className="mt-2 text-xs text-stone-500">{helper}</p>
      <input className="mt-3" name="file" type="file" accept={fileAccept} required />
      <button className="mt-3 rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white">{button}</button>
    </form>
  );
}
