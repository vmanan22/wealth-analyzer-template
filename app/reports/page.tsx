import { createMonthlyReport } from "@/app/actions";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { requireUserId } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type ReportJson = {
  title?: string;
  highlights?: string[];
};

export default async function ReportsPage() {
  const userId = await requireUserId();
  const reports = await prisma.report.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 12 });

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Reports" eyebrow="Investor-style PDF reports">
        <form action={createMonthlyReport}>
          <PrimaryButton>Generate monthly report</PrimaryButton>
        </form>
      </PageHeader>
      <div className="grid gap-4">
        {reports.map((report) => {
          const content = report.contentJson as ReportJson;
          return (
            <Card key={report.id}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-bold">{content.title ?? report.type}</h2>
                  <p className="text-sm text-stone-500">{report.periodStart.toLocaleDateString("en-IN")} - {report.periodEnd.toLocaleDateString("en-IN")}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(content.highlights ?? []).map((highlight) => (
                      <span key={highlight} className="rounded-md bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">{highlight}</span>
                    ))}
                  </div>
                </div>
                <a className="rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-ink" href={`/api/reports/${report.id}/pdf`}>Download PDF</a>
              </div>
            </Card>
          );
        })}
        {!reports.length ? <Card><p className="text-sm text-stone-500">No reports yet. Generate your first monthly report.</p></Card> : null}
      </div>
    </div>
  );
}
