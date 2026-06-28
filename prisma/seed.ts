import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type PortfolioVariant = "personal" | "demo";

const monthAgo = (months: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  date.setHours(0, 0, 0, 0);
  return date;
};

async function resetDatabase() {
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.advisorContextItem.deleteMany();
  await prisma.marketQuote.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.syncRun.deleteMany();
  await prisma.dataSource.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.report.deleteMany();
  await prisma.aiInsight.deleteMany();
  await prisma.importBatch.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.assetSnapshot.deleteMany();
  await prisma.liabilitySnapshot.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.liability.deleteMany();
  await prisma.goal.deleteMany();
  await prisma.institution.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.user.deleteMany();
}

async function seedUser(email: string, name: string, password: string) {
  return prisma.user.create({
    data: {
      email,
      name,
      passwordHash: await bcrypt.hash(password, 12)
    }
  });
}

async function seedPortfolio(userId: string, variant: PortfolioVariant) {
  const isPersonal = variant === "personal";
  const [self, spouse, family] = await Promise.all([
    prisma.owner.create({ data: { userId, name: "Self", type: "SELF" } }),
    prisma.owner.create({ data: { userId, name: "Spouse", type: "SPOUSE" } }),
    prisma.owner.create({ data: { userId, name: "Family", type: "FAMILY" } })
  ]);

  const institutionRows = isPersonal
    ? [
        ["Kuvera", "BROKER"],
        ["Zerodha", "BROKER"],
        ["EPFO", "RETIREMENT"],
        ["NPS CRA", "RETIREMENT"],
        ["HDFC Bank", "BANK"],
        ["LIC of India", "INSURANCE"],
        ["Manual", "MANUAL"]
      ]
    : [
        ["Nimbus Mutuals", "BROKER"],
        ["MockTrade", "BROKER"],
        ["FutureNest", "RETIREMENT"],
        ["Civic Pension Desk", "RETIREMENT"],
        ["Riverbank Demo", "BANK"],
        ["LifeShield Sandbox", "INSURANCE"],
        ["Manual Demo", "MANUAL"]
      ];

  const institutions = await Promise.all(
    institutionRows.map(([name, type]) => prisma.institution.create({ data: { userId, name, type } }))
  );
  const byName = Object.fromEntries(institutions.map((institution) => [institution.name, institution]));
  const mfInstitution = byName[isPersonal ? "Kuvera" : "Nimbus Mutuals"];
  const brokerInstitution = byName[isPersonal ? "Zerodha" : "MockTrade"];
  const retirementInstitution = byName[isPersonal ? "EPFO" : "FutureNest"];
  const pensionInstitution = byName[isPersonal ? "NPS CRA" : "Civic Pension Desk"];
  const bankInstitution = byName[isPersonal ? "HDFC Bank" : "Riverbank Demo"];
  const insuranceInstitution = byName[isPersonal ? "LIC of India" : "LifeShield Sandbox"];
  const manualInstitution = byName[isPersonal ? "Manual" : "Manual Demo"];
  const assets = await prisma.asset.createManyAndReturn({
    data: [
      {
        userId,
        ownerId: self.id,
        institutionId: mfInstitution.id,
        ownerType: "SELF",
        assetClass: "MUTUAL_FUND",
        name: isPersonal ? "ELSS Tax Saver Fund" : "Nimbus Balanced Advantage Fund",
        platform: isPersonal ? "Kuvera" : "Nimbus Mutuals",
        investedAmount: isPersonal ? 150000 : 73420,
        currentValue: isPersonal ? 174000 : 81275,
        units: isPersonal ? 824.267 : 342.119,
        currentPrice: isPersonal ? 204.3 : 237.56,
        sipAmount: isPersonal ? 3500 : 1750,
        liquidity: isPersonal ? "LOW" : "MEDIUM",
        taxCategory: isPersonal ? "ELSS" : "Hybrid MF",
        schemeCategory: isPersonal ? "ELSS" : "Balanced Advantage",
        folioMasked: isPersonal ? "PERSONAL1234" : "FIC-8421",
        lockIn: isPersonal,
        tags: isPersonal ? ["tax-saving", "equity"] : ["sample", "hybrid"]
      },
      {
        userId,
        ownerId: self.id,
        institutionId: mfInstitution.id,
        ownerType: "SELF",
        assetClass: "MUTUAL_FUND",
        name: isPersonal ? "Flexi Cap Fund" : "Aurora Overnight Fund",
        platform: isPersonal ? "Kuvera" : "Nimbus Mutuals",
        investedAmount: isPersonal ? 175000 : 48250,
        currentValue: isPersonal ? 198000 : 49380,
        units: isPersonal ? 1432.918 : 1191.447,
        currentPrice: isPersonal ? 96.03 : 41.45,
        sipAmount: isPersonal ? 10000 : 0,
        liquidity: "MEDIUM",
        taxCategory: isPersonal ? "Equity MF" : "Debt MF",
        schemeCategory: isPersonal ? "Flexi Cap" : "Overnight",
        folioMasked: isPersonal ? "PERSONAL5678" : "FIC-3197",
        tags: isPersonal ? ["equity", "long-term"] : ["sample", "cash-management"]
      },
      {
        userId,
        ownerId: self.id,
        institutionId: brokerInstitution.id,
        ownerType: "SELF",
        assetClass: isPersonal ? "STOCK" : "ETF",
        name: isPersonal ? "Direct Equity Basket" : "MockTrade Global ETF Basket",
        platform: isPersonal ? "Zerodha" : "MockTrade",
        investedAmount: isPersonal ? 450000 : 92500,
        currentValue: isPersonal ? 515000 : 87640,
        units: isPersonal ? 1 : 37,
        currentPrice: isPersonal ? 515000 : 2368.65,
        liquidity: "HIGH",
        taxCategory: isPersonal ? "Listed Equity" : "ETF",
        symbol: isPersonal ? "BASKET" : "MGETF",
        exchange: isPersonal ? "NSE" : "DEMO",
        sector: isPersonal ? "Diversified" : "Global Allocation",
        tags: isPersonal ? ["direct-equity"] : ["sample", "etf"]
      },
      {
        userId,
        ownerId: self.id,
        institutionId: retirementInstitution.id,
        ownerType: "SELF",
        assetClass: isPersonal ? "EPF" : "PPF",
        name: isPersonal ? "Employee Provident Fund" : "FutureNest Public Savings Ledger",
        investedAmount: isPersonal ? 900000 : 214000,
        currentValue: isPersonal ? 1125000 : 236800,
        sipAmount: isPersonal ? 18000 : 4500,
        liquidity: "LOW",
        taxCategory: isPersonal ? "Retirement" : "Small Savings",
        metadata: isPersonal
          ? {
              employeeContribution: 540000,
              employerContribution: 540000,
              eps: 45000,
              interestRate: 8.25
            }
          : {
              accountMasked: "PPF-7712",
              interestRate: 7.1,
              sample: true
            }
      },
      {
        userId,
        ownerId: self.id,
        institutionId: pensionInstitution.id,
        ownerType: "SELF",
        assetClass: isPersonal ? "NPS" : "BOND",
        name: isPersonal ? "NPS Tier I" : "Civic Pension Desk Bond Ladder",
        investedAmount: isPersonal ? 250000 : 156000,
        currentValue: isPersonal ? 330000 : 161900,
        sipAmount: isPersonal ? 5000 : 0,
        liquidity: isPersonal ? "LOW" : "MEDIUM",
        taxCategory: isPersonal ? "Retirement" : "Debt",
        metadata: isPersonal
          ? {
              equityAllocation: 65,
              corporateDebtAllocation: 20,
              governmentSecuritiesAllocation: 15,
              pensionFundManager: "HDFC Pension",
              tierType: "Tier I"
            }
          : {
              ladderMonths: 24,
              sample: true
            }
      },
      {
        userId,
        ownerId: family.id,
        institutionId: bankInstitution.id,
        ownerType: "FAMILY",
        assetClass: "SAVINGS",
        name: isPersonal ? "Family Savings" : "Riverbank Demo Operating Balance",
        investedAmount: isPersonal ? 300000 : 42890,
        currentValue: isPersonal ? 300000 : 42890,
        liquidity: "HIGH",
        taxCategory: "Savings Interest"
      },
      {
        userId,
        ownerId: spouse.id,
        institutionId: manualInstitution.id,
        ownerType: "SPOUSE",
        assetClass: isPersonal ? "GOLD" : "SGB",
        name: isPersonal ? "Family Physical Gold" : "Demo Sovereign Gold Bond 2031",
        investedAmount: isPersonal ? 280000 : 68700,
        currentValue: isPersonal ? 360000 : 72180,
        units: isPersonal ? 45 : 12,
        currentPrice: isPersonal ? 8000 : 6015,
        liquidity: "MEDIUM",
        taxCategory: isPersonal ? "Physical Asset" : "SGB",
        metadata: isPersonal ? { type: "Physical gold", purity: "22K", storage: "Bank locker" } : { series: "Fictional SGB 2031", sample: true }
      },
      {
        userId,
        ownerId: family.id,
        institutionId: manualInstitution.id,
        ownerType: "FAMILY",
        assetClass: isPersonal ? "PHYSICAL_PLOT" : "VEHICLE",
        name: isPersonal ? "Residential Plot" : "Demo Electric Scooter",
        investedAmount: isPersonal ? 1200000 : 118000,
        currentValue: isPersonal ? 1750000 : 83500,
        liquidity: isPersonal ? "LOW" : "MEDIUM",
        taxCategory: isPersonal ? "Real Estate" : "Depreciating Asset",
        metadata: isPersonal
          ? {
              location: "Private location masked",
              ownershipPercentage: 100,
              valuationDate: new Date().toISOString(),
              valuationSource: "Manual estimate"
            }
          : {
              registrationMasked: "DEMO-2042",
              valuationDate: new Date().toISOString(),
              sample: true
            }
      },
      {
        userId,
        ownerId: self.id,
        institutionId: insuranceInstitution.id,
        ownerType: "SELF",
        assetClass: isPersonal ? "LIC" : "ULIP",
        name: isPersonal ? "LIC Endowment Policy" : "LifeShield Sandbox Unit Plan",
        investedAmount: isPersonal ? 180000 : 65500,
        currentValue: isPersonal ? 220000 : 61240,
        sipAmount: isPersonal ? 5000 : 1100,
        liquidity: "LOW",
        taxCategory: "Insurance",
        metadata: isPersonal
          ? {
              policyMasked: "LIC-PERSONAL",
              sumAssured: 750000,
              premiumFrequency: "Annual",
              maturityValue: 550000
            }
          : {
              policyMasked: "SANDBOX-884",
              sumAssured: 250000,
              premiumFrequency: "Monthly",
              sample: true
            }
      },
      {
        userId,
        ownerId: self.id,
        institutionId: bankInstitution.id,
        ownerType: "SELF",
        assetClass: isPersonal ? "RECURRING_DEPOSIT" : "FIXED_DEPOSIT",
        name: isPersonal ? "Personal Monthly RD" : "Riverbank Demo Short FD",
        investedAmount: isPersonal ? 120000 : 37500,
        currentValue: isPersonal ? 124500 : 38360,
        sipAmount: isPersonal ? 10000 : undefined,
        liquidity: "MEDIUM",
        taxCategory: "Interest Income"
      }
    ]
  });

  const primaryLiability = await prisma.liability.create({
    data: {
      userId,
      ownerId: family.id,
      institutionId: bankInstitution.id,
      ownerType: "FAMILY",
      liabilityClass: isPersonal ? "HOME_LOAN" : "CAR_LOAN",
      lender: isPersonal ? "HDFC Bank" : "Riverbank Demo",
      name: isPersonal ? "Personal Home Loan" : "Demo Vehicle Loan",
      originalAmount: isPersonal ? 5500000 : 420000,
      outstandingAmount: isPersonal ? 2500000 : 188500,
      emi: isPersonal ? 35000 : 8900,
      interestRate: isPersonal ? 8.55 : 11.25,
      remainingTenureMonths: isPersonal ? 118 : 28,
      startDate: isPersonal ? new Date("2019-08-01") : new Date("2025-02-01"),
      endDate: isPersonal ? new Date("2036-06-01") : new Date("2028-05-01"),
      notes: isPersonal ? "Personal housing loan." : "Fictional demo loan for sample dashboards."
    }
  });

  for (const asset of assets) {
    const base = Number(asset.currentValue);
    const invested = Number(asset.investedAmount);
    for (let i = 11; i >= 0; i--) {
      const factor = 0.84 + (12 - i) * 0.013 + Math.sin(i) * 0.01;
      await prisma.assetSnapshot.create({
        data: {
          assetId: asset.id,
          snapshotDate: monthAgo(i),
          investedValue: Math.min(invested, invested * (0.72 + (12 - i) * 0.025)),
          currentValue: Math.round(base * factor),
          units: asset.units,
          price: asset.currentPrice
        }
      });
    }
  }

  for (let i = 11; i >= 0; i--) {
    await prisma.liabilitySnapshot.create({
      data: {
        liabilityId: primaryLiability.id,
        snapshotDate: monthAgo(i),
        outstandingAmount: Number(primaryLiability.outstandingAmount) + i * (isPersonal ? 22000 : 4200)
      }
    });
  }

  await prisma.goal.createMany({
    data: isPersonal
      ? [
          { userId, name: "5 Cr Net Worth", targetAmount: 50000000, expectedReturnPercentage: 11, targetDate: new Date("2037-03-31") },
          { userId, name: "10 Cr Net Worth", targetAmount: 100000000, expectedReturnPercentage: 11, targetDate: new Date("2043-03-31") },
          { userId, name: "25 Cr Net Worth", targetAmount: 250000000, expectedReturnPercentage: 10, targetDate: new Date("2050-03-31") },
          { userId, name: "Home Loan Closure", targetAmount: 2500000, currentMappedAmount: 0, expectedReturnPercentage: 0, targetDate: new Date("2032-03-31") },
          { userId, name: "Retirement Corpus", targetAmount: 120000000, expectedReturnPercentage: 10, targetDate: new Date("2048-03-31") },
          { userId, name: "Child Education Fund", targetAmount: 15000000, expectedReturnPercentage: 9, targetDate: new Date("2040-03-31") }
        ]
      : [
          { userId, name: "Kitchen Renovation", targetAmount: 425000, currentMappedAmount: 60000, expectedReturnPercentage: 5, targetDate: new Date("2028-09-30") },
          { userId, name: "Sabbatical Fund", targetAmount: 950000, currentMappedAmount: 0, expectedReturnPercentage: 7, targetDate: new Date("2030-12-31") },
          { userId, name: "Studio Equipment Upgrade", targetAmount: 310000, currentMappedAmount: 0, expectedReturnPercentage: 6, targetDate: new Date("2029-06-30") }
        ]
  });

  await prisma.importBatch.create({
    data: {
      userId,
      importType: "GENERIC_CSV",
      fileName: isPersonal ? "manan-local-assets.csv" : "demo-assets.csv",
      rowCount: 3,
      importedCount: 3,
      status: "IMPORTED",
      mapping: { name: "name", currentValue: "current_value" }
    }
  });

  const dataSources = await Promise.all([
    prisma.dataSource.create({ data: { userId, provider: "ZERODHA", name: "Zerodha", authType: "OAUTH", status: isPersonal ? "SYNCED" : "CONFIG_REQUIRED", lastSyncAt: isPersonal ? new Date() : undefined, metadata: { note: "Use Kite Connect OAuth/API tokens or upload holdings CSV." } } }),
    prisma.dataSource.create({ data: { userId, provider: "CAS", name: "CAS / CAMS / KFintech / MFCentral", authType: "FILE_UPLOAD", status: isPersonal ? "SYNCED" : "NOT_CONNECTED", lastSyncAt: isPersonal ? new Date() : undefined, metadata: { note: "Upload CAS statement exports; no broker credentials required." } } }),
    prisma.dataSource.create({ data: { userId, provider: "NSE", name: "NSE Market Context", authType: "LICENSED_FEED", status: "CONFIG_REQUIRED", metadata: { note: "Use licensed or permitted market feeds. Do not scrape NSE pages." } } }),
    prisma.dataSource.create({ data: { userId, provider: "LIC", name: "LIC", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", metadata: { note: "Manual or statement upload first. Never store LIC credentials." } } }),
    prisma.dataSource.create({ data: { userId, provider: "EPFO", name: "EPFO", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", metadata: { note: "Manual/passbook import only. No EPFO website scraping." } } }),
    prisma.dataSource.create({ data: { userId, provider: "NPS", name: "NPS CRA", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", metadata: { note: "Manual/CRA statement import." } } }),
    prisma.dataSource.create({ data: { userId, provider: "LAND_RECORDS", name: "Land / Real Estate", authType: "MANUAL", status: "NOT_CONNECTED", metadata: { note: "Use manual appraisals, circle rates, state portals, or future valuation providers." } } }),
    prisma.dataSource.create({ data: { userId, provider: "ACCOUNT_AGGREGATOR", name: "Account Aggregator", authType: "CONSENT", status: "CONFIG_REQUIRED", metadata: { note: "Future RBI-regulated consent flow for bank/deposit data." } } })
  ]);

  await prisma.advisorContextItem.createMany({
    data: [
      {
        userId,
        dataSourceId: dataSources[2].id,
        kind: "WARNING",
        title: "NSE real-time feeds require permitted/licensed data",
        source: "NSE",
        asOfDate: new Date(),
        confidence: 1,
        staleness: "licensed_required",
        payload: { guidance: "Use broker APIs or licensed vendors; do not scrape NSE pages.", decisionUse: "decision_support_only" }
      },
      {
        userId,
        dataSourceId: dataSources[6].id,
        kind: "VALUATION_NOTE",
        title: "Land values need manual or licensed valuation",
        source: "Land / Real Estate",
        asOfDate: new Date(),
        confidence: 0.7,
        staleness: "manual",
        payload: { guidance: "Income Tax AIS may show historical transactions, not current market value.", decisionUse: "decision_support_only" }
      }
    ]
  });

  await prisma.auditLog.create({
    data: {
      userId,
      action: isPersonal ? "SEED_PERSONAL_PORTFOLIO" : "SEED_DEMO_PORTFOLIO",
      entityType: "User",
      entityId: userId,
      metadata: { source: "prisma/seed.ts", variant }
    }
  });
}

async function main() {
  await resetDatabase();

  const demoUser = await seedUser(
    process.env.DEMO_USER_EMAIL ?? "demo@wealth.local",
    "Demo User",
    process.env.DEMO_USER_PASSWORD ?? "password123"
  );
  await seedPortfolio(demoUser.id, "demo");

  if (process.env.SEED_PERSONAL_USER === "true") {
    const personalUser = await seedUser(
      process.env.PERSONAL_USER_EMAIL ?? "personal@wealth.local",
      process.env.PERSONAL_USER_NAME ?? "Personal User",
      process.env.PERSONAL_USER_PASSWORD ?? "password123"
    );
    await seedPortfolio(personalUser.id, "personal");
    console.log(`Seeded personal user ${personalUser.email}`);
  }

  console.log(`Seeded demo user ${demoUser.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
