import { deleteAiProviderConfig, deleteAllUserData, saveAiProviderConfig } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { requireUserId } from "@/lib/auth";
import { getAdvisorProviderStatus } from "@/lib/advisor";
import { prisma } from "@/lib/prisma";
import { KeyRound, Sparkles, Terminal } from "lucide-react";

export default async function SettingsPage() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  const provider = await getAdvisorProviderStatus(userId);
  const providerConfigs = await prisma.aiProviderConfig.findMany({
    where: { userId },
    orderBy: [{ isActive: "desc" }, { provider: "asc" }]
  });
  const providerConfigMap = new Map(providerConfigs.map((config) => [config.provider, config]));

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Settings" eyebrow="Security, privacy, export" />
      <Card className="mb-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2">
              <KeyRound size={20} className="text-leaf" />
              <h2 className="text-lg font-bold">AI Provider Keys</h2>
            </div>
            <p className="mt-2 text-sm text-stone-500">
              Configure OpenAI, Gemini, or Claude from this protected settings page. Keys are encrypted before storage and are never shown back in the browser.
            </p>
          </div>
          <div className={`rounded-md px-3 py-2 text-sm font-semibold ${provider.configured ? "bg-mint text-leaf" : "bg-amber-50 text-amber-700"}`}>
            {provider.configured ? `Configured: ${provider.provider} / ${provider.model}` : `Waiting for ${provider.missingKey}`}
          </div>
        </div>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          <ProviderConfigCard title="Gemini" provider="gemini" defaultModel="gemini-2.5-flash-lite" active={provider.provider === "gemini" && provider.source === "database"} config={providerConfigMap.get("gemini")} recommended modelOptions={[
            { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite - lowest cost" },
            { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash - better reasoning" }
          ]} />
          <ProviderConfigCard title="OpenAI" provider="openai" defaultModel="gpt-4.1-mini" active={provider.provider === "openai" && provider.source === "database"} config={providerConfigMap.get("openai")} modelOptions={[
            { value: "gpt-4.1-mini", label: "GPT-4.1 mini" },
            { value: "gpt-4.1", label: "GPT-4.1" }
          ]} />
          <ProviderConfigCard title="Claude" provider="claude" defaultModel="claude-3-5-sonnet-latest" active={provider.provider === "claude" && provider.source === "database"} config={providerConfigMap.get("claude")} modelOptions={[
            { value: "claude-3-5-haiku-latest", label: "Claude Haiku - lower cost" },
            { value: "claude-3-5-sonnet-latest", label: "Claude Sonnet - deeper reasoning" }
          ]} />
        </div>
        <div className="mt-4 rounded-md border border-leaf/20 bg-mint p-4">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-leaf" />
            <h3 className="font-bold">Fast Start With Gemini</h3>
          </div>
          <div className="mt-3 grid gap-3 text-sm text-stone-700 md:grid-cols-3">
            <p><span className="font-semibold text-ink">1.</span> Create a key in <a className="font-semibold text-leaf hover:text-ink" href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Google AI Studio</a>.</p>
            <p><span className="font-semibold text-ink">2.</span> Choose Gemini 2.5 Flash-Lite for demos or Flash for stronger reasoning.</p>
            <p><span className="font-semibold text-ink">3.</span> Save the key, then open Advisor and run Analyze portfolio.</p>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2 rounded-md bg-stone-50 p-3 text-sm text-stone-600">
          <Terminal size={16} className="mt-0.5 text-leaf" />
          <p>Saved GUI keys take effect immediately for the next Advisor request. Cloud deployments can still use environment secrets as a fallback when no GUI key is active.</p>
        </div>
      </Card>
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

function ProviderConfigCard({ title, provider, defaultModel, active, config, recommended = false, modelOptions }: { title: string; provider: string; defaultModel: string; active: boolean; config?: { model: string; apiKeyLast4: string | null; isActive: boolean; lastUsedAt: Date | null }; recommended?: boolean; modelOptions: { value: string; label: string }[] }) {
  return (
    <div className={`rounded-md border p-4 ${active ? "border-leaf bg-mint" : "border-stone-200 bg-stone-50"}`}>
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">{title}</p>
        <span className={`rounded-md px-2 py-1 text-xs font-semibold ${active || recommended ? "bg-white text-leaf" : config ? "bg-white text-stone-600" : "bg-white text-stone-500"}`}>
          {active ? "active" : recommended ? "recommended" : config ? "saved" : provider}
        </span>
      </div>
      <form action={saveAiProviderConfig} className="mt-4 grid gap-3">
        <input type="hidden" name="provider" value={provider} />
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-600">Model</span>
          <select name="model" defaultValue={config?.model ?? defaultModel}>
            {modelOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="font-medium text-stone-600">API key</span>
          <input name="apiKey" type="password" placeholder={config?.apiKeyLast4 ? `Saved key ending ${config.apiKeyLast4}` : "Paste API key"} autoComplete="off" />
        </label>
        <button className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-ink">{config ? "Save and use" : "Save key"}</button>
      </form>
      <div className="mt-3 space-y-1 text-xs text-stone-500">
        <p>{config?.apiKeyLast4 ? `Key stored: ending ${config.apiKeyLast4}` : "No GUI key saved."}</p>
        <p>{config?.lastUsedAt ? `Last used: ${config.lastUsedAt.toLocaleString("en-IN")}` : "Last used: not yet"}</p>
      </div>
      {config ? (
        <form action={deleteAiProviderConfig} className="mt-3">
          <input type="hidden" name="provider" value={provider} />
          <button className="text-sm font-semibold text-coral hover:text-ink">Remove saved key</button>
        </form>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3"><span className="text-stone-500">{label}</span><span className="font-semibold">{value}</span></div>;
}
