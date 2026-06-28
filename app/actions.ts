"use server";

import { AssetClass, LiabilityClass, LiquidityCategory, OwnerType, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { answerAdvisorChallenge, generateAdvisorResult } from "@/lib/advisor";
import { ensureDefaultDataSources } from "@/lib/data-console";
import { syncCasFile } from "@/lib/integrations/kuvera";
import { syncZerodhaFile } from "@/lib/integrations/zerodha";
import { syncFileConnector } from "@/lib/integrations/file-connectors";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireUserId } from "@/lib/auth";
import { parseCsv, parseMoney, rowHash } from "@/lib/csv";
import { buildMonthlyReportContent } from "@/lib/reporting";
import { encryptSecret, secretLast4 } from "@/lib/secret-vault";

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function formNumber(formData: FormData, key: string) {
  const value = formString(formData, key);
  return value ? Number(value) : 0;
}

function optionalDate(value: string) {
  return value ? new Date(value) : undefined;
}

export async function createLocalUser(formData: FormData) {
  const name = formString(formData, "name");
  const email = formString(formData, "email").toLowerCase();
  const password = formString(formData, "password");

  if (!name || !email || password.length < 8) {
    redirect("/login?signup=invalid");
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    redirect("/login?signup=exists");
  }

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash: await hashPassword(password),
      owners: {
        create: [
          { name: "Self", type: "SELF" },
          { name: "Spouse", type: "SPOUSE" },
          { name: "Family", type: "FAMILY" }
        ]
      },
      institutions: {
        create: [
          { name: "Manual", type: "MANUAL" },
          { name: "Bank", type: "BANK" },
          { name: "Broker", type: "BROKER" }
        ]
      }
    }
  });

  await ensureDefaultDataSources(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: "CREATE_LOCAL_USER", entityType: "User", entityId: user.id } });
  redirect(`/login?signup=created&email=${encodeURIComponent(email)}`);
}

export async function createAsset(formData: FormData) {
  const userId = await requireUserId();
  await prisma.asset.create({
    data: {
      userId,
      ownerType: formString(formData, "ownerType") as OwnerType,
      assetClass: formString(formData, "assetClass") as AssetClass,
      name: formString(formData, "name"),
      platform: formString(formData, "platform") || undefined,
      investedAmount: formNumber(formData, "investedAmount"),
      currentValue: formNumber(formData, "currentValue"),
      units: formNumber(formData, "units") || undefined,
      currentPrice: formNumber(formData, "currentPrice") || undefined,
      purchaseDate: optionalDate(formString(formData, "purchaseDate")),
      contributionDate: optionalDate(formString(formData, "contributionDate")),
      notes: formString(formData, "notes") || undefined,
      tags: formString(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean),
      liquidity: formString(formData, "liquidity") as LiquidityCategory,
      taxCategory: formString(formData, "taxCategory") || undefined,
      sipAmount: formNumber(formData, "sipAmount") || undefined
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "CREATE_ASSET", entityType: "Asset", metadata: { name: formString(formData, "name") } } });
  revalidatePath("/assets");
  redirect("/assets");
}

export async function createLiability(formData: FormData) {
  const userId = await requireUserId();
  await prisma.liability.create({
    data: {
      userId,
      ownerType: formString(formData, "ownerType") as OwnerType,
      liabilityClass: formString(formData, "liabilityClass") as LiabilityClass,
      lender: formString(formData, "lender"),
      name: formString(formData, "name"),
      originalAmount: formNumber(formData, "originalAmount"),
      outstandingAmount: formNumber(formData, "outstandingAmount"),
      emi: formNumber(formData, "emi") || undefined,
      interestRate: formNumber(formData, "interestRate") || undefined,
      remainingTenureMonths: formNumber(formData, "remainingTenureMonths") || undefined,
      startDate: optionalDate(formString(formData, "startDate")),
      endDate: optionalDate(formString(formData, "endDate")),
      notes: formString(formData, "notes") || undefined
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "CREATE_LIABILITY", entityType: "Liability", metadata: { name: formString(formData, "name") } } });
  revalidatePath("/liabilities");
  redirect("/liabilities");
}

export async function createMonthlySnapshot() {
  const userId = await requireUserId();
  const snapshotDate = new Date();
  snapshotDate.setDate(1);
  snapshotDate.setHours(0, 0, 0, 0);
  const [assets, liabilities] = await Promise.all([
    prisma.asset.findMany({ where: { userId } }),
    prisma.liability.findMany({ where: { userId } })
  ]);

  for (const asset of assets) {
    await prisma.assetSnapshot.upsert({
      where: { assetId_snapshotDate: { assetId: asset.id, snapshotDate } },
      create: {
        assetId: asset.id,
        snapshotDate,
        investedValue: asset.investedAmount,
        currentValue: asset.currentValue,
        units: asset.units,
        price: asset.currentPrice
      },
      update: {
        investedValue: asset.investedAmount,
        currentValue: asset.currentValue,
        units: asset.units,
        price: asset.currentPrice
      }
    });
  }

  for (const liability of liabilities) {
    await prisma.liabilitySnapshot.upsert({
      where: { liabilityId_snapshotDate: { liabilityId: liability.id, snapshotDate } },
      create: { liabilityId: liability.id, snapshotDate, outstandingAmount: liability.outstandingAmount },
      update: { outstandingAmount: liability.outstandingAmount }
    });
  }

  await prisma.auditLog.create({ data: { userId, action: "CREATE_MONTHLY_SNAPSHOT", entityType: "Snapshot", metadata: { assets: assets.length, liabilities: liabilities.length } } });
  revalidatePath("/snapshots");
  revalidatePath("/dashboard");
}

export async function createGoal(formData: FormData) {
  const userId = await requireUserId();
  await prisma.goal.create({
    data: {
      userId,
      name: formString(formData, "name"),
      targetAmount: formNumber(formData, "targetAmount"),
      targetDate: optionalDate(formString(formData, "targetDate")),
      expectedReturnPercentage: formNumber(formData, "expectedReturnPercentage") || undefined,
      notes: formString(formData, "notes") || undefined
    }
  });
  revalidatePath("/goals");
  redirect("/goals");
}

export async function importGenericCsv(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("CSV file is required.");
  const rows = parseCsv(await file.text());
  let importedCount = 0;
  let duplicateCount = 0;

  for (const row of rows) {
    const name = row[formString(formData, "nameColumn")] ?? row.name ?? row.Name;
    if (!name) continue;
    const hash = rowHash(row, [formString(formData, "dateColumn"), formString(formData, "nameColumn"), formString(formData, "amountColumn")]);
    const existing = await prisma.transaction.findUnique({ where: { userId_sourceHash: { userId, sourceHash: hash } } });
    if (existing) {
      duplicateCount += 1;
      continue;
    }
    const currentValue = parseMoney(row[formString(formData, "currentValueColumn")] ?? row.current_value ?? row.currentValue);
    const investedAmount = parseMoney(row[formString(formData, "amountColumn")] ?? row.invested_amount ?? row.amount);
    const asset = await prisma.asset.create({
      data: {
        userId,
        ownerType: (row.ownerType as OwnerType) || "SELF",
        assetClass: (row.assetClass as AssetClass) || "OTHER",
        name,
        platform: row.platform,
        investedAmount,
        currentValue: currentValue || investedAmount,
        liquidity: (row.liquidity as LiquidityCategory) || "MEDIUM",
        taxCategory: row.taxCategory,
        notes: row.notes
      }
    });
    await prisma.transaction.create({
      data: {
        userId,
        assetId: asset.id,
        transactionDate: row[formString(formData, "dateColumn")] ? new Date(row[formString(formData, "dateColumn")]) : new Date(),
        assetName: name,
        amount: investedAmount || currentValue,
        sourceHash: hash,
        transactionType: "ADJUSTMENT"
      }
    });
    importedCount += 1;
  }

  await prisma.importBatch.create({
    data: {
      userId,
      importType: "GENERIC_CSV",
      fileName: file.name,
      rowCount: rows.length,
      importedCount,
      duplicateCount,
      status: "IMPORTED",
      mapping: {
        nameColumn: formString(formData, "nameColumn"),
        amountColumn: formString(formData, "amountColumn"),
        currentValueColumn: formString(formData, "currentValueColumn"),
        dateColumn: formString(formData, "dateColumn")
      }
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "IMPORT_CSV", entityType: "ImportBatch", metadata: { fileName: file.name, importedCount, duplicateCount } } });
  revalidatePath("/imports");
  revalidatePath("/assets");
  redirect("/imports");
}

export async function deleteAllUserData() {
  const userId = await requireUserId();
  await prisma.user.delete({ where: { id: userId } });
  redirect("/dashboard");
}

export async function generateAdvisorInsight() {
  const userId = await requireUserId();
  const { payload, result, status } = await generateAdvisorResult(userId);
  const insight = await prisma.aiInsight.create({
    data: {
      userId,
      portfolioSnapshotJson: payload,
      recommendationsJson: result,
      riskScore: result.riskScore,
      status
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "GENERATE_AI_INSIGHT", entityType: "AiInsight", entityId: insight.id, metadata: { status, riskScore: result.riskScore, provider: result.provider, model: result.model } } });
  revalidatePath("/advisor");
  revalidatePath("/dashboard");
  redirect("/advisor");
}

export async function saveAiProviderConfig(formData: FormData) {
  const userId = await requireUserId();
  const provider = formString(formData, "provider").toLowerCase();
  const model = formString(formData, "model") || defaultModelForProvider(provider);
  const apiKey = formString(formData, "apiKey");

  if (!["openai", "gemini", "claude"].includes(provider)) {
    redirect("/settings?ai=invalid-provider");
  }

  const existing = await prisma.aiProviderConfig.findUnique({
    where: { userId_provider: { userId, provider } }
  });

  if (!apiKey && !existing) {
    redirect("/settings?ai=missing-key");
  }

  await prisma.$transaction([
    prisma.aiProviderConfig.updateMany({
      where: { userId },
      data: { isActive: false }
    }),
    prisma.aiProviderConfig.upsert({
      where: { userId_provider: { userId, provider } },
      create: {
        userId,
        provider,
        model,
        encryptedApiKey: encryptSecret(apiKey),
        apiKeyLast4: secretLast4(apiKey),
        isActive: true
      },
      update: {
        model,
        ...(apiKey ? { encryptedApiKey: encryptSecret(apiKey), apiKeyLast4: secretLast4(apiKey) } : {}),
        isActive: true
      }
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: "SAVE_AI_PROVIDER_CONFIG",
        entityType: "AiProviderConfig",
        metadata: { provider, model, keyUpdated: Boolean(apiKey) }
      }
    })
  ]);

  revalidatePath("/settings");
  revalidatePath("/advisor");
  redirect("/settings?ai=saved");
}

export async function deleteAiProviderConfig(formData: FormData) {
  const userId = await requireUserId();
  const provider = formString(formData, "provider").toLowerCase();
  await prisma.aiProviderConfig.deleteMany({ where: { userId, provider } });
  await prisma.auditLog.create({
    data: {
      userId,
      action: "DELETE_AI_PROVIDER_CONFIG",
      entityType: "AiProviderConfig",
      metadata: { provider }
    }
  });
  revalidatePath("/settings");
  revalidatePath("/advisor");
  redirect("/settings?ai=deleted");
}

export async function challengeAdvisorInsight(formData: FormData) {
  const userId = await requireUserId();
  const question = formString(formData, "question");
  const insightId = formString(formData, "insightId") || undefined;
  if (!question) {
    redirect("/advisor");
  }
  const conversationId = await answerAdvisorChallenge(userId, question, insightId);
  await prisma.auditLog.create({ data: { userId, action: "CHALLENGE_AI_INSIGHT", entityType: "AiConversation", entityId: conversationId } });
  revalidatePath("/advisor");
  redirect("/advisor");
}

export async function createMonthlyReport() {
  const userId = await requireUserId();
  const latestInsight = await prisma.aiInsight.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } });
  const report = await buildMonthlyReportContent(latestInsight);
  await prisma.report.create({
    data: {
      userId,
      aiInsightId: latestInsight?.id,
      type: "MONTHLY",
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      contentJson: JSON.parse(JSON.stringify(report.content)) as Prisma.InputJsonValue
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "CREATE_MONTHLY_REPORT", entityType: "Report", metadata: { type: "MONTHLY" } } });
  revalidatePath("/reports");
  redirect("/reports");
}

function defaultModelForProvider(provider: string) {
  if (provider === "gemini") return "gemini-2.5-flash-lite";
  if (provider === "claude") return "claude-3-5-sonnet-latest";
  return "gpt-4.1-mini";
}

export async function initializeDataConsole() {
  const userId = await requireUserId();
  await ensureDefaultDataSources(userId);
  await prisma.auditLog.create({ data: { userId, action: "INITIALIZE_DATA_CONSOLE", entityType: "DataSource" } });
  revalidatePath("/data-console");
}

export async function importZerodhaHoldings(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Zerodha holdings file is required.");
  const result = await syncZerodhaFile(userId, file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_ZERODHA_CSV", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function importCasHoldings(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("CAS statement file is required.");
  const result = await syncCasFile(userId, file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_CAS_CSV", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function importLicStatement(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("LIC statement file is required.");
  const result = await syncFileConnector(userId, "LIC", file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_LIC_FILE", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function importEpfoStatement(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("EPFO statement file is required.");
  const result = await syncFileConnector(userId, "EPFO", file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_EPFO_FILE", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function importNpsStatement(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("NPS statement file is required.");
  const result = await syncFileConnector(userId, "NPS", file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_NPS_FILE", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function importLandValuation(formData: FormData) {
  const userId = await requireUserId();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("Land valuation file is required.");
  const result = await syncFileConnector(userId, "LAND_RECORDS", file);
  await prisma.auditLog.create({ data: { userId, action: "SYNC_LAND_FILE", entityType: "DataSource", metadata: result } });
  revalidatePath("/data-console");
  revalidatePath("/assets");
  redirect("/data-console");
}

export async function addNseLicensedFeedWarning() {
  const userId = await requireUserId();
  const source = await prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: "NSE" } },
    create: { userId, provider: "NSE", name: "NSE Market Context", authType: "LICENSED_FEED", status: "CONFIG_REQUIRED", metadata: { note: "Use licensed APIs or permitted public/index feeds. Do not scrape NSE pages." } },
    update: { status: "CONFIG_REQUIRED", metadata: { note: "Use licensed APIs or permitted public/index feeds. Do not scrape NSE pages." } }
  });
  await prisma.advisorContextItem.create({
    data: {
      userId,
      dataSourceId: source.id,
      kind: "WARNING",
      title: "NSE real-time market feed requires a permitted/licensed source",
      source: "NSE",
      asOfDate: new Date(),
      confidence: 1,
      staleness: "licensed_required",
      payload: {
        decisionUse: "decision_support_only",
        guidance: "Do not scrape NSE pages in production. Use broker APIs, licensed vendors, or permitted public/index data."
      }
    }
  });
  revalidatePath("/data-console");
}

export async function addMarketIntelContext(formData: FormData) {
  const userId = await requireUserId();
  const title = formString(formData, "title");
  const sourceName = formString(formData, "sourceName");
  const sourceType = formString(formData, "sourceType") || "trusted_manual";
  const summary = formString(formData, "summary");
  const tags = formString(formData, "tags").split(",").map((tag) => tag.trim()).filter(Boolean);
  const url = formString(formData, "url");
  const asOfDate = optionalDate(formString(formData, "asOfDate")) ?? new Date();

  if (!title || !sourceName || !summary) {
    redirect("/data-console");
  }

  const source = await prisma.dataSource.upsert({
    where: { userId_provider: { userId, provider: "MANUAL" } },
    create: { userId, provider: "MANUAL", name: "Manual Market Intel", authType: "MANUAL", status: "SYNCED", lastSyncAt: new Date(), metadata: { note: "Manual trusted market/news context for AI Advisor." } },
    update: { status: "SYNCED", lastSyncAt: new Date(), metadata: { note: "Manual trusted market/news context for AI Advisor." } }
  });

  await prisma.advisorContextItem.create({
    data: {
      userId,
      dataSourceId: source.id,
      kind: "WARNING",
      title,
      source: sourceName,
      asOfDate,
      confidence: 0.75,
      staleness: "manual_trusted_context",
      payload: {
        sourceType,
        summary,
        tags,
        url: url || null,
        decisionUse: "advisor_context_only"
      }
    }
  });
  await prisma.auditLog.create({ data: { userId, action: "ADD_MARKET_INTEL_CONTEXT", entityType: "AdvisorContextItem", metadata: { sourceName, sourceType, tags } } });
  revalidatePath("/data-console");
  revalidatePath("/advisor");
  redirect("/data-console");
}
