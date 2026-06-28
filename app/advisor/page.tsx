import { Brain, CheckCircle2, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import { challengeAdvisorInsight, generateAdvisorInsight } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { requireUserId } from "@/lib/auth";
import { getAdvisorProviderStatus, type AdvisorRecommendation, type AdvisorResult } from "@/lib/advisor";
import { formatRupees } from "@/lib/format";
import { prisma } from "@/lib/prisma";

type SafePayload = {
  holdingReviews?: {
    label: string;
    type: string;
    returnPercent: number;
    monthlyContribution: number;
    currentValue: number;
    liquidity: string;
    sector?: string | null;
    schemeCategory?: string | null;
  }[];
  advisorContextFeed?: {
    kind: string;
    title: string;
    source: string;
    asOfDate: string;
    confidence: number;
    staleness: string;
  }[];
};

export default async function AdvisorPage() {
  const userId = await requireUserId();
  const [insights, conversations] = await Promise.all([
    prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.aiConversation.findMany({
      where: { userId },
      include: { messages: { orderBy: { createdAt: "asc" }, take: 6 } },
      orderBy: { updatedAt: "desc" },
      take: 4
    })
  ]);
  const latest = insights[0];
  const result = (latest?.recommendationsJson ?? {}) as AdvisorResult;
  const payload = (latest?.portfolioSnapshotJson ?? {}) as SafePayload;
  const provider = await getAdvisorProviderStatus(userId);
  const recommendations = result.recommendations ?? [];
  const marketIntel = (payload.advisorContextFeed ?? []).filter((item) => ["WARNING", "VALUATION_NOTE", "MARKET_PRICE"].includes(item.kind)).slice(0, 6);

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="AI Portfolio Advisor" eyebrow="Explainable decision support">
        <form action={generateAdvisorInsight}>
          <PrimaryButton>Analyze portfolio</PrimaryButton>
        </form>
      </PageHeader>

      <div className="grid gap-4 xl:grid-cols-4">
        <StatusCard label="Provider" value={provider.provider} helper={provider.configured ? provider.model : `Missing ${provider.missingKey}`} good={provider.configured} />
        <StatusCard label="Portfolio health" value={result.portfolioHealth?.replace("_", " ") ?? "Not analyzed"} helper="Generated from latest insight" good={result.portfolioHealth === "good"} />
        <StatusCard label="Risk score" value={latest ? `${latest.riskScore ?? result.riskScore ?? "-"} / 100` : "-"} helper="Lower is calmer" />
        <StatusCard label="Privacy mode" value="Sanitized" helper="No secrets or raw statements sent" good />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <div className="flex items-center gap-2">
            <Brain size={20} className="text-leaf" />
            <h2 className="text-lg font-bold">Latest Insight</h2>
          </div>
          {latest ? (
            <div className="mt-4 space-y-4">
              <Metric label="Status" value={latest.status} />
              <Metric label="Provider" value={`${result.provider ?? provider.provider} / ${result.model ?? provider.model}`} />
              <Metric label="Generated" value={latest.createdAt.toLocaleString("en-IN")} />
              <p className="rounded-md bg-mint p-3 text-sm text-leaf">{result.summary}</p>
              <p className="text-xs text-stone-500">{result.disclaimer ?? "Educational analysis only. This is not SEBI-registered investment advice."}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Generate the first advisor review to see allocation, debt, liquidity, goals, MF/stock review, and reasoning.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center gap-2">
            <ShieldCheck size={20} className="text-leaf" />
            <h2 className="text-lg font-bold">Data Security</h2>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {["Passwords, tokens, API keys excluded", "Account, folio, policy IDs masked", "Raw uploads not sent to AI", "Payload snapshot stored for transparency"].map((item) => (
              <div key={item} className="flex items-center gap-2 rounded-md bg-stone-50 px-3 py-3 text-sm">
                <CheckCircle2 size={16} className="text-leaf" />
                {item}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm text-stone-500">{provider.privacy}</p>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-4 flex items-center gap-2">
            <Sparkles size={20} className="text-leaf" />
            <h2 className="text-lg font-bold">Recommendations With Reasoning</h2>
          </div>
          <div className="grid gap-4">
            {recommendations.map((item, index) => <RecommendationCard key={`${item.title}-${index}`} item={item} />)}
            {!recommendations.length ? <p className="text-sm text-stone-500">No recommendations yet. Analyze the portfolio first.</p> : null}
          </div>
        </Card>

        <div className="grid gap-6">
          <Card>
            <h2 className="mb-4 text-lg font-bold">MF / Stock Review</h2>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr><th>Holding</th><th>Type</th><th>Return</th><th>Monthly</th></tr>
                </thead>
                <tbody>
                  {(payload.holdingReviews ?? []).slice(0, 8).map((holding) => (
                    <tr key={`${holding.label}-${holding.type}`}>
                      <td className="font-semibold">{holding.label}</td>
                      <td>{holding.type}</td>
                      <td>{holding.returnPercent.toFixed(1)}%</td>
                      <td>{formatRupees(holding.monthlyContribution, { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!(payload.holdingReviews ?? []).length ? <p className="mt-3 text-sm text-stone-500">Analyze portfolio to populate holding-level review.</p> : null}
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-lg font-bold">Market Intel Context</h2>
            <div className="grid gap-3">
              {marketIntel.map((item) => (
                <div key={`${item.title}-${item.asOfDate}`} className="rounded-md bg-stone-50 p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{item.title}</p>
                    <span className="text-xs text-stone-500">{item.source}</span>
                  </div>
                  <p className="mt-1 text-xs text-stone-500">{new Date(item.asOfDate).toLocaleDateString("en-IN")} · confidence {Number(item.confidence).toFixed(2)} · {item.staleness}</p>
                </div>
              ))}
              {!marketIntel.length ? <p className="text-sm text-stone-500">Add manual or licensed market intel from Data Console.</p> : null}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <div className="flex items-center gap-2">
            <MessageSquareText size={20} className="text-leaf" />
            <h2 className="text-lg font-bold">Challenge This Insight</h2>
          </div>
          <p className="mt-2 text-sm text-stone-500">Ask why a recommendation was made or test a scenario. Stored reasoning is reused first to reduce repeat AI calls.</p>
          <form action={challengeAdvisorInsight} className="mt-4 grid gap-3">
            <input type="hidden" name="insightId" value={latest?.id ?? ""} />
            <textarea name="question" rows={5} placeholder="Example: Why did you mark this mutual fund as watch?" required />
            <button className="rounded-md bg-leaf px-4 py-3 text-sm font-semibold text-white hover:bg-ink">Ask Advisor</button>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-bold">Recent Advisor Conversations</h2>
          <div className="grid gap-4">
            {conversations.map((conversation) => (
              <div key={conversation.id} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold">{conversation.title}</p>
                  <span className="text-xs text-stone-500">{conversation.updatedAt.toLocaleString("en-IN")}</span>
                </div>
                <div className="mt-3 grid gap-2">
                  {conversation.messages.map((message) => (
                    <p key={message.id} className="text-sm text-stone-600">
                      <span className="font-semibold text-ink">{message.role}:</span> {message.content.slice(0, 240)}{message.content.length > 240 ? "..." : ""}
                      {message.reusedReasoning ? <span className="ml-2 rounded-md bg-mint px-2 py-0.5 text-xs font-semibold text-leaf">stored reasoning</span> : null}
                    </p>
                  ))}
                </div>
              </div>
            ))}
            {!conversations.length ? <p className="text-sm text-stone-500">No challenge conversations yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StatusCard({ label, value, helper, good = false }: { label: string; value: string; helper: string; good?: boolean }) {
  return (
    <Card>
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className={`mt-2 text-xl font-bold capitalize ${good ? "text-leaf" : "text-ink"}`}>{value}</p>
      <p className="mt-2 text-sm text-stone-500">{helper}</p>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3 text-sm"><span className="text-stone-500">{label}</span><span className="font-bold">{value}</span></div>;
}

function RecommendationCard({ item }: { item: AdvisorRecommendation }) {
  const proposedMove = item.proposedMove ?? item.action ?? "Review before acting.";
  const reason = item.reason ?? "This area affects portfolio risk or goal progress.";
  const explanation = item.educationalExplanation ?? "This is a decision-support prompt, not an automatic instruction to transact.";
  const whatWouldChangeThis = item.whatWouldChangeThis ?? "Updated portfolio values, goals, or market data could change this view.";
  const supportingData = Array.isArray(item.supportingData) ? item.supportingData : [];
  const tradeoffs = Array.isArray(item.tradeoffs) ? item.tradeoffs : [];

  return (
    <details className="rounded-md border border-stone-200 bg-stone-50 p-4" open>
      <summary className="cursor-pointer list-none">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="font-bold">{item.title}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">{item.category.replace("_", " ")} · {item.priority} · {item.decisionLabel}</p>
          </div>
          <span className="rounded-md bg-white px-3 py-1 text-xs font-semibold text-leaf">{proposedMove}</span>
        </div>
      </summary>
      <div className="mt-4 grid gap-3 text-sm text-stone-600">
        <p><span className="font-semibold text-ink">Reason:</span> {reason}</p>
        <p><span className="font-semibold text-ink">Explanation:</span> {explanation}</p>
        <p><span className="font-semibold text-ink">Action:</span> {item.action}</p>
        <p><span className="font-semibold text-ink">What would change this:</span> {whatWouldChangeThis}</p>
        {supportingData.length ? <p><span className="font-semibold text-ink">Supporting data:</span> {supportingData.join("; ")}</p> : null}
        {tradeoffs.length ? <p><span className="font-semibold text-ink">Tradeoffs:</span> {tradeoffs.join("; ")}</p> : null}
      </div>
    </details>
  );
}
