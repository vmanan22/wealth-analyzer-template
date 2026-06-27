import { deleteAllUserData } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Settings" eyebrow="Security, privacy, export" />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <h2 className="text-lg font-bold">Local Authentication</h2>
          <div className="mt-4 space-y-3 text-sm">
            <Row label="Active user" value={user?.email ?? "No user seeded"} />
            <Row label="Password storage" value="bcrypt hash" />
            <Row label="Bank credentials" value="Never stored" />
            <Row label="Policy/account masking" value="Supported in schema and UI helpers" />
          </div>
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Data Controls</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <a className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white" href="/api/export">Export all data</a>
            <form action={deleteAllUserData}>
              <PrimaryButton>Delete all user data</PrimaryButton>
            </form>
          </div>
          <p className="mt-4 text-sm text-stone-500">Deletion removes the current user and cascades portfolio data through Prisma relations.</p>
        </Card>
      </div>
      <Card className="mt-6">
        <h2 className="text-lg font-bold">Future Live Integrations</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {["Zerodha Kite Connect", "Account Aggregator", "EPFO Passbook", "NPS CRA Statement"].map((item) => (
            <div key={item} className="rounded-md bg-stone-50 p-4">
              <p className="font-semibold">{item}</p>
              <p className="mt-1 text-sm text-stone-500">OAuth, token, or consent flow only. No password scraping.</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3"><span className="text-stone-500">{label}</span><span className="font-semibold">{value}</span></div>;
}
