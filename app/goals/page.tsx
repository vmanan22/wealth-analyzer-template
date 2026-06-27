import { createGoal } from "@/app/actions";
import { GoalBars } from "@/components/charts";
import { Card, PageHeader, PrimaryButton } from "@/components/ui";
import { getPortfolioData } from "@/lib/data";
import { formatRupees, percent, toNumber } from "@/lib/format";

export default async function GoalsPage() {
  const { goals, summary } = await getPortfolioData();
  const goalBars = goals.map((goal) => ({
    name: goal.name.replace(" Net Worth", ""),
    progress: Math.min(100, (summary.netWorth / toNumber(goal.targetAmount)) * 100)
  }));

  return (
    <div className="p-4 md:p-8">
      <PageHeader title="Goals" eyebrow="Milestones and planning" />
      <div className="grid gap-6 xl:grid-cols-[1fr_0.7fr]">
        <Card>
          <h2 className="text-lg font-bold">Progress</h2>
          <GoalBars data={goalBars} />
          <div className="mt-4 overflow-x-auto">
            <table>
              <thead>
                <tr><th>Goal</th><th>Target</th><th>Progress</th><th>Gap</th><th>Target date</th><th>Return assumption</th></tr>
              </thead>
              <tbody>
                {goals.map((goal) => {
                  const target = toNumber(goal.targetAmount);
                  const progress = Math.min(100, (summary.netWorth / target) * 100);
                  return (
                    <tr key={goal.id}>
                      <td className="font-semibold">{goal.name}</td>
                      <td>{formatRupees(target, { compact: true })}</td>
                      <td>{percent(progress)}</td>
                      <td>{formatRupees(Math.max(0, target - summary.netWorth), { compact: true })}</td>
                      <td>{goal.targetDate?.toLocaleDateString("en-IN") ?? "-"}</td>
                      <td>{goal.expectedReturnPercentage?.toString() ?? "-"}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-bold">Create Goal</h2>
          <form action={createGoal} className="grid gap-3">
            <input name="name" required placeholder="Emergency fund" />
            <input name="targetAmount" required type="number" placeholder="Target amount" />
            <input name="targetDate" type="date" />
            <input name="expectedReturnPercentage" type="number" step="0.01" placeholder="Expected return %" />
            <textarea name="notes" rows={3} placeholder="Notes" />
            <PrimaryButton>Save goal</PrimaryButton>
          </form>
        </Card>
      </div>
    </div>
  );
}
