import { generateAdvisorInsight } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type AdvisorJson = {
  summary?: string;
  riskScore?: number;
  disclaimer?: string;
  recommendations?: {
    title: string;
    category: string;
    priority: string;
    decisionLabel?: string;
    rationale: string;
    action: string;
  }[];
};

export default async function AdvisorPage() {
  const userId = await requireUserId();
  const insights = await prisma.aiInsight.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 });
  const latest = insights[0];
  const recommendations = (latest?.recommendationsJson ?? {}) as AdvisorJson;

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="AI Portfolio Advisor" eyebrow="Educational analysis">
        <form action={generateAdvisorInsight}>
          <PrimaryButton>Analyze portfolio</PrimaryButton>
        </form>
      </PageHeader>
      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <Card>
          <h2 className="text-lg font-bold">Latest Insight</h2>
          {latest ? (
            <div className="mt-4 space-y-4">
              <Metric label="Status" value={latest.status} />
              <Metric label="Risk score" value={`${latest.riskScore ?? recommendations.riskScore ?? "-"} / 100`} />
              <Metric label="Generated" value={latest.createdAt.toLocaleString("en-IN")} />
              <p className="rounded-md bg-mint p-3 text-sm text-leaf">{recommendations.summary}</p>
              <p className="text-xs text-stone-500">{recommendations.disclaimer ?? "Educational analysis only. This is not SEBI-registered investment advice."}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Generate the first advisor review to see allocation, debt, liquidity, and goal suggestions.</p>
          )}
        </Card>
        <Card>
          <h2 className="text-lg font-bold">Recommendations</h2>
          <div className="mt-4 grid gap-3">
            {(recommendations.recommendations ?? []).map((item, index) => (
              <div key={`${item.title}-${index}`} className="rounded-md border border-stone-200 bg-stone-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{item.title}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-stone-500">{item.category} · {item.priority} · {item.decisionLabel ?? "review"}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-stone-600">{item.rationale}</p>
                <p className="mt-2 text-sm font-semibold text-ink">{item.action}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="flex justify-between rounded-md bg-stone-50 px-3 py-3 text-sm"><span className="text-stone-500">{label}</span><span className="font-bold">{value}</span></div>;
}
