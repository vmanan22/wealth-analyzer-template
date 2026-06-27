import OpenAI from "openai";
import { getPortfolioData } from "@/lib/data";
import { formatAssetClass } from "@/lib/asset-options";
import { toNumber } from "@/lib/format";

export type AdvisorRecommendation = {
  title: string;
  category: "allocation" | "debt" | "liquidity" | "goals" | "contributions" | "risk";
  priority: "high" | "medium" | "low";
  rationale: string;
  action: string;
};

export type AdvisorResult = {
  summary: string;
  riskScore: number;
  recommendations: AdvisorRecommendation[];
  disclaimer: string;
};

export async function buildAdvisorPayload() {
  const portfolio = await getPortfolioData();
  return {
    summary: portfolio.summary,
    allocation: portfolio.allocation,
    goals: portfolio.goals.map((goal) => ({
      name: goal.name,
      targetAmount: toNumber(goal.targetAmount),
      targetDate: goal.targetDate?.toISOString() ?? null
    })),
    assets: portfolio.assets.map((asset) => ({
      name: asset.name,
      assetClass: formatAssetClass(asset.assetClass),
      owner: asset.ownerType,
      investedAmount: toNumber(asset.investedAmount),
      currentValue: toNumber(asset.currentValue),
      monthlyContribution: toNumber(asset.sipAmount),
      liquidity: asset.liquidity,
      taxCategory: asset.taxCategory
    })),
    liabilities: portfolio.liabilities.map((liability) => ({
      name: liability.name,
      type: liability.liabilityClass,
      outstandingAmount: toNumber(liability.outstandingAmount),
      emi: toNumber(liability.emi),
      interestRate: toNumber(liability.interestRate)
    }))
  };
}

export async function generateAdvisorResult(): Promise<{ payload: Awaited<ReturnType<typeof buildAdvisorPayload>>; result: AdvisorResult; status: string }> {
  const payload = await buildAdvisorPayload();
  const fallback = buildRuleBasedAdvisor(payload);

  if (!process.env.OPENAI_API_KEY) {
    return { payload, result: fallback, status: "CONFIG_REQUIRED" };
  }

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4.1-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a careful Indian personal-finance portfolio analyst. Return only JSON matching this shape: { summary: string, riskScore: number, recommendations: [{ title, category, priority, rationale, action }], disclaimer: string }. Do not claim to be SEBI registered. Do not recommend specific securities as guaranteed winners."
        },
        {
          role: "user",
          content: JSON.stringify({
            instruction:
              "Analyze this portfolio for allocation, debt, liquidity, goals, monthly contributions, and concentration risk. Keep suggestions educational and practical.",
            portfolio: payload
          })
        }
      ]
    });

    const content = response.choices[0]?.message.content;
    if (!content) return { payload, result: fallback, status: "EMPTY_AI_RESPONSE" };
    return { payload, result: normalizeAdvisorResult(JSON.parse(content)), status: "COMPLETED" };
  } catch {
    return { payload, result: fallback, status: "AI_ERROR_FALLBACK" };
  }
}

function normalizeAdvisorResult(value: Partial<AdvisorResult>): AdvisorResult {
  return {
    summary: value.summary ?? "Portfolio analysis generated.",
    riskScore: Math.min(100, Math.max(0, Number(value.riskScore ?? 50))),
    recommendations: Array.isArray(value.recommendations) ? value.recommendations.slice(0, 8).map((item) => ({
      title: String(item.title ?? "Portfolio recommendation"),
      category: item.category ?? "risk",
      priority: item.priority ?? "medium",
      rationale: String(item.rationale ?? "Review this item before making changes."),
      action: String(item.action ?? "Discuss with a qualified advisor.")
    })) : [],
    disclaimer: value.disclaimer ?? "Educational analysis only. This is not SEBI-registered investment advice."
  };
}

function buildRuleBasedAdvisor(payload: Awaited<ReturnType<typeof buildAdvisorPayload>>): AdvisorResult {
  const debtRatio = payload.summary.debtToAssetRatio;
  const liquidRatio = payload.summary.totalAssets ? (payload.summary.liquidAssets / payload.summary.totalAssets) * 100 : 0;
  const illiquidRatio = payload.summary.totalAssets ? (payload.summary.illiquidAssets / payload.summary.totalAssets) * 100 : 0;

  return {
    summary: "Rule-based portfolio review generated. Configure OPENAI_API_KEY for richer AI commentary.",
    riskScore: Math.round(Math.min(85, Math.max(20, debtRatio + illiquidRatio / 2))),
    recommendations: [
      {
        title: "Review loan burden",
        category: "debt",
        priority: debtRatio > 40 ? "high" : "medium",
        rationale: `Debt-to-asset ratio is ${debtRatio.toFixed(1)}%.`,
        action: "Compare incremental prepayment against expected investment returns and liquidity needs."
      },
      {
        title: "Strengthen liquid buffer",
        category: "liquidity",
        priority: liquidRatio < 10 ? "high" : "medium",
        rationale: `Liquid assets are ${liquidRatio.toFixed(1)}% of total assets.`,
        action: "Maintain an emergency fund before increasing illiquid allocations."
      },
      {
        title: "Track illiquid concentration",
        category: "allocation",
        priority: illiquidRatio > 45 ? "high" : "low",
        rationale: `Illiquid assets are ${illiquidRatio.toFixed(1)}% of total assets.`,
        action: "Keep real estate, locked retirement assets, and insurance-linked assets visible in allocation reviews."
      }
    ],
    disclaimer: "Educational analysis only. This is not SEBI-registered investment advice."
  };
}
