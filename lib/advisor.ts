import OpenAI from "openai";
import type { Prisma } from "@prisma/client";
import { getPortfolioData } from "@/lib/data";
import { formatAssetClass } from "@/lib/asset-options";
import { toNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/secret-vault";

export type DecisionLabel = "continue" | "review" | "watch" | "pause and reassess" | "rebalance candidate" | "insufficient data" | "discuss with advisor";
export type AiProviderName = "openai" | "gemini" | "claude";

export type AdvisorRecommendation = {
  title: string;
  category: "allocation" | "debt" | "liquidity" | "goals" | "contributions" | "risk" | "mutual_fund" | "stock" | "market_intel";
  priority: "high" | "medium" | "low";
  decisionLabel: DecisionLabel;
  proposedMove: string;
  reason: string;
  supportingData: string[];
  tradeoffs: string[];
  whatWouldChangeThis: string;
  educationalExplanation: string;
  action: string;
};

export type AdvisorResult = {
  summary: string;
  portfolioHealth: "good" | "mixed" | "needs_attention" | "insufficient_data";
  riskScore: number;
  provider: string;
  model: string;
  recommendations: AdvisorRecommendation[];
  disclaimer: string;
};

export type SafeAdvisorPayload = Awaited<ReturnType<typeof buildSafeAdvisorPayload>>;

type AiProvider = {
  name: AiProviderName;
  model: string;
  configured: boolean;
  missingKey?: string;
  source: "database" | "environment";
  complete(prompt: string, jsonMode?: boolean): Promise<string>;
};

const allowedLabels: DecisionLabel[] = ["continue", "review", "watch", "pause and reassess", "rebalance candidate", "insufficient data", "discuss with advisor"];

export async function getAdvisorProviderStatus(userId?: string) {
  const provider = await getAiProvider(userId);
  return {
    provider: provider.name,
    model: provider.model,
    configured: provider.configured,
    missingKey: provider.missingKey,
    source: provider.source,
    mode: "external_api_sanitized_payload",
    privacy: "Only sanitized portfolio facts, advisor context, and the user question are sent to the configured provider."
  };
}

export async function buildSafeAdvisorPayload() {
  const portfolio = await getPortfolioData();
  const contextItems = await prisma.advisorContextItem.findMany({
    where: { userId: portfolio.userId },
    orderBy: { asOfDate: "desc" },
    take: 75
  });

  const assets = portfolio.assets.map((asset) => {
    const investedAmount = toNumber(asset.investedAmount);
    const currentValue = toNumber(asset.currentValue);
    const gainPercent = investedAmount ? ((currentValue - investedAmount) / investedAmount) * 100 : 0;
    return {
      label: maskIdentifier(asset.name),
      assetClass: formatAssetClass(asset.assetClass),
      owner: asset.ownerType,
      investedAmount,
      currentValue,
      returnPercent: Number(gainPercent.toFixed(2)),
      monthlyContribution: toNumber(asset.sipAmount),
      liquidity: asset.liquidity,
      taxCategory: asset.taxCategory ?? null,
      schemeCategory: asset.schemeCategory ?? null,
      lockIn: asset.lockIn,
      symbol: asset.symbol ? maskIdentifier(asset.symbol) : null,
      exchange: asset.exchange ?? null,
      sector: asset.sector ?? null
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    summary: portfolio.summary,
    allocation: portfolio.allocation,
    goals: portfolio.goals.map((goal) => ({
      name: maskIdentifier(goal.name),
      targetAmount: toNumber(goal.targetAmount),
      currentMappedAmount: toNumber(goal.currentMappedAmount),
      expectedReturnPercentage: toNumber(goal.expectedReturnPercentage),
      targetDate: goal.targetDate?.toISOString() ?? null
    })),
    assets,
    holdingReviews: assets
      .filter((asset) => ["Mutual Fund", "Stock", "ETF"].includes(asset.assetClass))
      .map((asset) => ({
        label: asset.label,
        type: asset.assetClass,
        returnPercent: asset.returnPercent,
        monthlyContribution: asset.monthlyContribution,
        currentValue: asset.currentValue,
        liquidity: asset.liquidity,
        sector: asset.sector,
        schemeCategory: asset.schemeCategory
      })),
    liabilities: portfolio.liabilities.map((liability) => ({
      label: maskIdentifier(liability.name),
      type: liability.liabilityClass,
      outstandingAmount: toNumber(liability.outstandingAmount),
      emi: toNumber(liability.emi),
      interestRate: toNumber(liability.interestRate),
      remainingTenureMonths: liability.remainingTenureMonths
    })),
    advisorContextFeed: contextItems.map((item) => ({
      kind: item.kind,
      title: maskIdentifier(item.title),
      source: item.source,
      asOfDate: item.asOfDate.toISOString(),
      confidence: toNumber(item.confidence),
      staleness: item.staleness,
      payload: sanitizeJson(item.payload)
    })),
    guardrails: {
      privacy: "Sanitized payload only. Secrets, credentials, account numbers, full folios, raw statements, and OAuth tokens are excluded.",
      mode: process.env.RIA_MODE === "true" ? "ria_mode_requested_but_not_enabled_in_public_template" : "decision_support_only",
      prohibitedDefaultOutputs: ["direct buy order", "direct sell order", "guaranteed return", "target price instruction"],
      allowedLabels
    }
  };
}

export const buildAdvisorPayload = buildSafeAdvisorPayload;

export async function generateAdvisorResult(userId?: string): Promise<{ payload: SafeAdvisorPayload; result: AdvisorResult; status: string }> {
  const payload = await buildSafeAdvisorPayload();
  const provider = await getAiProvider(userId);
  const fallback = buildRuleBasedAdvisor(payload, provider);

  if (!provider.configured) {
    return { payload, result: fallback, status: "CONFIG_REQUIRED" };
  }

  try {
    const content = await provider.complete(buildAdvisorPrompt(payload), true);
    await markProviderUsed(userId, provider);
    return { payload, result: normalizeAdvisorResult(JSON.parse(content), provider), status: "COMPLETED" };
  } catch {
    return { payload, result: fallback, status: "AI_ERROR_FALLBACK" };
  }
}

export async function answerAdvisorChallenge(userId: string, question: string, insightId?: string) {
  const latestInsight = insightId
    ? await prisma.aiInsight.findFirst({ where: { id: insightId, userId } })
    : await prisma.aiInsight.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });

  const conversation = await prisma.aiConversation.create({
    data: {
      userId,
      aiInsightId: latestInsight?.id,
      title: question.slice(0, 80) || "Advisor challenge"
    }
  });

  await prisma.aiMessage.create({
    data: {
      userId,
      conversationId: conversation.id,
      role: "user",
      content: question
    }
  });

  const cachedAnswer = latestInsight ? answerFromStoredReasoning(question, latestInsight.recommendationsJson as AdvisorResult) : null;
  if (cachedAnswer) {
    await prisma.aiMessage.create({
      data: {
        userId,
        conversationId: conversation.id,
        role: "assistant",
        content: cachedAnswer,
        reusedReasoning: true,
        metadata: { source: "stored_reasoning" }
      }
    });
    return conversation.id;
  }

  const provider = await getAiProvider(userId);
  const payload = await buildSafeAdvisorPayload();
  const fallback = "I do not have enough stored reasoning to answer that confidently. Review the latest portfolio insight, update missing data, and discuss the scenario with a qualified advisor before acting.";
  let answer = fallback;

  if (provider.configured) {
    try {
      answer = await provider.complete(buildChallengePrompt(question, payload, latestInsight?.recommendationsJson), false);
      await markProviderUsed(userId, provider);
    } catch {
      answer = fallback;
    }
  }

  await prisma.aiMessage.create({
    data: {
      userId,
      conversationId: conversation.id,
      role: "assistant",
      content: answer,
      reusedReasoning: false,
      metadata: { source: provider.configured ? provider.name : "rule_fallback" }
    }
  });

  return conversation.id;
}

async function getAiProvider(userId?: string): Promise<AiProvider> {
  if (userId) {
    const config = await prisma.aiProviderConfig.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" }
    });
    if (config) {
      try {
        const apiKey = decryptSecret(config.encryptedApiKey);
        return providerFromConfig(config.provider, config.model, apiKey, "database");
      } catch {
        return providerFromConfig(config.provider, config.model, "", "database");
      }
    }
  }

  const selected = (process.env.AI_PROVIDER ?? "openai").toLowerCase();
  const model = envModelForProvider(selected);
  const apiKey = envKeyForProvider(selected);
  return providerFromConfig(selected, model, apiKey, "environment");
}

function providerFromConfig(provider: string, model: string, apiKey: string | undefined, source: AiProvider["source"]): AiProvider {
  const selected = provider.toLowerCase() as AiProviderName;
  if (selected === "gemini") return geminiProvider(model, apiKey, source);
  if (selected === "claude") return claudeProvider(model, apiKey, source);
  return openAiProvider(model, apiKey, source);
}

function openAiProvider(model: string, apiKey: string | undefined, source: AiProvider["source"]): AiProvider {
  return {
    name: "openai",
    model,
    configured: Boolean(apiKey),
    missingKey: source === "database" ? "saved OpenAI key" : "OPENAI_API_KEY",
    source,
    async complete(prompt, jsonMode = true) {
      const client = new OpenAI({ apiKey });
      const response = await client.chat.completions.create({
        model,
        ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
        messages: [
          { role: "system", content: advisorSystemPrompt() },
          { role: "user", content: prompt }
        ]
      });
      return response.choices[0]?.message.content ?? "{}";
    }
  };
}

function geminiProvider(model: string, apiKey: string | undefined, source: AiProvider["source"]): AiProvider {
  return {
    name: "gemini",
    model,
    configured: Boolean(apiKey),
    missingKey: source === "database" ? "saved Gemini key" : "GEMINI_API_KEY",
    source,
    async complete(prompt) {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `${advisorSystemPrompt()}\n\n${prompt}` }] }] })
      });
      const json = await response.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    }
  };
}

function claudeProvider(model: string, apiKey: string | undefined, source: AiProvider["source"]): AiProvider {
  return {
    name: "claude",
    model,
    configured: Boolean(apiKey),
    missingKey: source === "database" ? "saved Claude key" : "ANTHROPIC_API_KEY",
    source,
    async complete(prompt) {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey ?? "",
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model,
          max_tokens: 1800,
          system: advisorSystemPrompt(),
          messages: [{ role: "user", content: prompt }]
        })
      });
      const json = await response.json() as { content?: { text?: string }[] };
      return json.content?.[0]?.text ?? "{}";
    }
  };
}

function envModelForProvider(provider: string) {
  if (provider === "gemini") return process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite";
  if (provider === "claude") return process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest";
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

function envKeyForProvider(provider: string) {
  if (provider === "gemini") return process.env.GEMINI_API_KEY;
  if (provider === "claude") return process.env.ANTHROPIC_API_KEY;
  return process.env.OPENAI_API_KEY;
}

async function markProviderUsed(userId: string | undefined, provider: AiProvider) {
  if (!userId || provider.source !== "database") return;
  await prisma.aiProviderConfig.updateMany({
    where: { userId, provider: provider.name, isActive: true },
    data: { lastUsedAt: new Date() }
  });
}

function advisorSystemPrompt() {
  return [
    "You are a careful Indian personal-finance portfolio analyst.",
    "Return only valid JSON when asked for JSON.",
    "Default mode is educational decision support only.",
    "Do not claim to be SEBI registered.",
    "Do not provide direct personalized buy/sell orders, guaranteed returns, or target-price instructions.",
    `Use only these decision labels: ${allowedLabels.join(", ")}.`,
    "Explain why each move is proposed in simple investor language so the user learns and avoids repeat questions."
  ].join(" ");
}

function buildAdvisorPrompt(payload: SafeAdvisorPayload) {
  return JSON.stringify({
    instruction:
      "Analyze this sanitized Indian household portfolio. Return JSON matching { summary, portfolioHealth, riskScore, provider, model, recommendations: [{ title, category, priority, decisionLabel, proposedMove, reason, supportingData, tradeoffs, whatWouldChangeThis, educationalExplanation, action }], disclaimer }. Include MF/stock-level review where data exists. Prefer education and explainability over commands.",
    portfolio: payload
  });
}

function buildChallengePrompt(question: string, payload: SafeAdvisorPayload, latestInsight?: Prisma.JsonValue) {
  return JSON.stringify({
    instruction:
      "Answer the user's challenge using the sanitized portfolio and prior insight. Be concise, educational, and do not provide direct buy/sell orders. If data is insufficient, say exactly what data is missing.",
    question,
    latestInsight,
    portfolio: payload
  });
}

function normalizeAdvisorResult(value: Partial<AdvisorResult>, provider: AiProvider): AdvisorResult {
  return {
    summary: String(value.summary ?? "Portfolio analysis generated."),
    portfolioHealth: ["good", "mixed", "needs_attention", "insufficient_data"].includes(String(value.portfolioHealth)) ? value.portfolioHealth as AdvisorResult["portfolioHealth"] : "mixed",
    riskScore: Math.min(100, Math.max(0, Number(value.riskScore ?? 50))),
    provider: provider.name,
    model: provider.model,
    recommendations: Array.isArray(value.recommendations) ? value.recommendations.slice(0, 10).map(normalizeRecommendation) : [],
    disclaimer: value.disclaimer ?? "Educational analysis only. This is not SEBI-registered investment advice."
  };
}

function normalizeRecommendation(item: Partial<AdvisorRecommendation>): AdvisorRecommendation {
  const decisionLabel = allowedLabels.includes(item.decisionLabel as DecisionLabel) ? item.decisionLabel as DecisionLabel : "review";
  return {
    title: String(item.title ?? "Portfolio recommendation"),
    category: item.category ?? "risk",
    priority: item.priority ?? "medium",
    decisionLabel,
    proposedMove: String(item.proposedMove ?? item.action ?? "Review before making changes."),
    reason: String(item.reason ?? "This area affects portfolio risk or goal progress."),
    supportingData: Array.isArray(item.supportingData) ? item.supportingData.map(String).slice(0, 5) : [],
    tradeoffs: Array.isArray(item.tradeoffs) ? item.tradeoffs.map(String).slice(0, 5) : ["Changing allocation can affect liquidity, tax, and goal timing."],
    whatWouldChangeThis: String(item.whatWouldChangeThis ?? "Updated portfolio values, goals, or market data could change this view."),
    educationalExplanation: String(item.educationalExplanation ?? "This recommendation is meant to help you understand the risk/return tradeoff before acting."),
    action: String(item.action ?? "Discuss with a qualified advisor before making changes.")
  };
}

function buildRuleBasedAdvisor(payload: SafeAdvisorPayload, provider: AiProvider): AdvisorResult {
  const debtRatio = payload.summary.debtToAssetRatio;
  const liquidRatio = payload.summary.totalAssets ? (payload.summary.liquidAssets / payload.summary.totalAssets) * 100 : 0;
  const illiquidRatio = payload.summary.totalAssets ? (payload.summary.illiquidAssets / payload.summary.totalAssets) * 100 : 0;
  const holdingReviews = payload.holdingReviews.slice(0, 4).map((holding): AdvisorRecommendation => ({
    title: `${holding.label}: ${holding.type} review`,
    category: holding.type === "Mutual Fund" ? "mutual_fund" : "stock",
    priority: Math.abs(holding.returnPercent) > 20 ? "medium" : "low",
    decisionLabel: holding.returnPercent < -10 ? "watch" : "continue",
    proposedMove: holding.returnPercent < -10 ? "Keep this holding on watch and verify if it still fits the goal." : "Continue tracking this holding with periodic review.",
    reason: `The holding shows ${holding.returnPercent.toFixed(1)}% absolute return based on available invested and current value.`,
    supportingData: [`Current value ${holding.currentValue}`, `Monthly contribution ${holding.monthlyContribution}`, `Liquidity ${holding.liquidity}`],
    tradeoffs: ["Short-term underperformance alone is not enough to exit.", "Tax, lock-in, and goal timing should be checked before changes."],
    whatWouldChangeThis: "Fresh NAV/quote data, category benchmark comparison, or a changed goal timeline could change the label.",
    educationalExplanation: "A holding review compares return, contribution, liquidity, and goal fit. It is a prompt to investigate, not an automatic transaction instruction.",
    action: "Review facts, compare with benchmark/category, and discuss with an advisor before changing contributions."
  }));

  return {
    summary: provider.configured
      ? "Rule-based portfolio review generated because the AI provider response was unavailable."
      : `Rule-based portfolio review generated. Configure ${provider.missingKey} for richer ${provider.name} commentary.`,
    portfolioHealth: debtRatio > 45 || liquidRatio < 8 ? "needs_attention" : "mixed",
    riskScore: Math.round(Math.min(85, Math.max(20, debtRatio + illiquidRatio / 2))),
    provider: provider.name,
    model: provider.model,
    recommendations: [
      {
        title: "Review loan burden",
        category: "debt",
        priority: debtRatio > 40 ? "high" : "medium",
        decisionLabel: debtRatio > 40 ? "review" : "continue",
        proposedMove: "Compare loan prepayment versus investing surplus cash.",
        reason: `Debt-to-asset ratio is ${debtRatio.toFixed(1)}%.`,
        supportingData: [`Debt-to-asset ratio ${debtRatio.toFixed(1)}%`, `Total liabilities ${payload.summary.totalLiabilities}`],
        tradeoffs: ["Prepayment reduces certainty of interest cost.", "Investing may build wealth but carries market risk."],
        whatWouldChangeThis: "Lower interest rates, higher liquid buffer, or goal deadline changes could alter this priority.",
        educationalExplanation: "Debt reduces net worth and monthly flexibility. The right move depends on interest rate, risk appetite, and emergency fund strength.",
        action: "Compare incremental prepayment against expected investment returns and liquidity needs."
      },
      {
        title: "Strengthen liquid buffer",
        category: "liquidity",
        priority: liquidRatio < 10 ? "high" : "medium",
        decisionLabel: liquidRatio < 10 ? "watch" : "continue",
        proposedMove: "Maintain enough liquid assets before increasing illiquid allocation.",
        reason: `Liquid assets are ${liquidRatio.toFixed(1)}% of total assets.`,
        supportingData: [`Liquid ratio ${liquidRatio.toFixed(1)}%`, `Illiquid ratio ${illiquidRatio.toFixed(1)}%`],
        tradeoffs: ["Cash-like assets reduce volatility but may return less.", "Illiquid assets can help long-term wealth but are harder to access."],
        whatWouldChangeThis: "A larger emergency fund or lower monthly EMI burden can reduce this concern.",
        educationalExplanation: "Liquidity is your shock absorber. It prevents forced selling when markets or income are stressed.",
        action: "Build or preserve an emergency fund before increasing locked or illiquid investments."
      },
      ...holdingReviews
    ],
    disclaimer: "Educational analysis only. This is not SEBI-registered investment advice."
  };
}

function answerFromStoredReasoning(question: string, insight: AdvisorResult | null) {
  if (!insight?.recommendations?.length) return null;
  const lowerQuestion = question.toLowerCase();
  const matched = insight.recommendations.find((item) => {
    const haystack = `${item.title} ${item.category} ${item.decisionLabel} ${item.proposedMove ?? item.action ?? ""}`.toLowerCase();
    return lowerQuestion.split(/\s+/).filter((word) => word.length > 3).some((word) => haystack.includes(word));
  });
  if (!matched) return null;
  const supportingData = Array.isArray(matched.supportingData) ? matched.supportingData : [];
  const tradeoffs = Array.isArray(matched.tradeoffs) ? matched.tradeoffs : [];
  return [
    `Stored reasoning for ${matched.title}:`,
    `Proposed move: ${matched.proposedMove ?? matched.action ?? "Review before acting."}`,
    `Why: ${matched.reason ?? "The stored insight marked this area for review based on portfolio risk or goal fit."}`,
    supportingData.length ? `Supporting data: ${supportingData.join("; ")}` : "",
    tradeoffs.length ? `Tradeoffs: ${tradeoffs.join("; ")}` : "",
    `What could change this: ${matched.whatWouldChangeThis ?? "Updated portfolio values, goals, market data, or risk preference could change this view."}`,
    `Plain-English explanation: ${matched.educationalExplanation ?? "This is a decision-support prompt, not an automatic instruction to transact."}`,
    "This is educational decision support, not SEBI-registered investment advice."
  ].filter(Boolean).join("\n\n");
}

function maskIdentifier(value: string) {
  return value.replace(/[A-Z]{2,}[-/]?\d{3,}|[0-9]{4,}/gi, (match) => `${match.slice(0, 3)}***`);
}

function sanitizeJson(value: Prisma.JsonValue): Prisma.JsonValue {
  if (Array.isArray(value)) return value.map(sanitizeJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, entry]) => {
        if (/password|secret|token|credential|account|folio|policy|raw|statement/i.test(key)) return [];
        if (typeof entry === "string") return [[key, maskIdentifier(entry)]];
        return [[key, sanitizeJson(entry as Prisma.JsonValue)]];
      })
    );
  }
  if (typeof value === "string") return maskIdentifier(value);
  return value;
}
