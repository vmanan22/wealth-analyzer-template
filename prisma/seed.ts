import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const monthAgo = (months: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - months);
  return date;
};

async function main() {
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

  const user = await prisma.user.create({
    data: {
      email: process.env.DEMO_USER_EMAIL ?? "demo@wealth.local",
      name: "Demo User",
      passwordHash: await bcrypt.hash(process.env.DEMO_USER_PASSWORD ?? "password123", 12)
    }
  });

  const [self, spouse, family] = await Promise.all([
    prisma.owner.create({ data: { userId: user.id, name: "Self", type: "SELF" } }),
    prisma.owner.create({ data: { userId: user.id, name: "Spouse", type: "SPOUSE" } }),
    prisma.owner.create({ data: { userId: user.id, name: "Family", type: "FAMILY" } })
  ]);

  const institutions = await Promise.all(
    [
      ["Kuvera", "BROKER"],
      ["Zerodha", "BROKER"],
      ["EPFO", "RETIREMENT"],
      ["NPS CRA", "RETIREMENT"],
      ["HDFC Bank", "BANK"],
      ["LIC of India", "INSURANCE"],
      ["Manual", "MANUAL"]
    ].map(([name, type]) => prisma.institution.create({ data: { userId: user.id, name, type } }))
  );
  const byName = Object.fromEntries(institutions.map((institution) => [institution.name, institution]));

  const assets = await prisma.asset.createManyAndReturn({
    data: [
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName.Kuvera.id,
        ownerType: "SELF",
        assetClass: "MUTUAL_FUND",
        name: "Sample ELSS Tax Saver Fund",
        platform: "Kuvera",
        investedAmount: 150000,
        currentValue: 174000,
        units: 824.267,
        currentPrice: 204.30,
        sipAmount: 3500,
        liquidity: "LOW",
        taxCategory: "ELSS",
        schemeCategory: "ELSS",
        folioMasked: "DEMO1234",
        lockIn: true,
        tags: ["tax-saving", "equity"]
      },
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName.Kuvera.id,
        ownerType: "SELF",
        assetClass: "MUTUAL_FUND",
        name: "Sample Flexi Cap Fund",
        platform: "Kuvera",
        investedAmount: 175000,
        currentValue: 198000,
        units: 1432.918,
        currentPrice: 96.03,
        sipAmount: 10000,
        liquidity: "MEDIUM",
        taxCategory: "Equity MF",
        schemeCategory: "Flexi Cap",
        folioMasked: "DEMO5678",
        tags: ["equity", "global"]
      },
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName.Zerodha.id,
        ownerType: "SELF",
        assetClass: "STOCK",
        name: "Sample Equity Holdings Basket",
        platform: "Zerodha",
        investedAmount: 450000,
        currentValue: 515000,
        units: 1,
        currentPrice: 585000,
        liquidity: "HIGH",
        taxCategory: "Listed Equity",
        symbol: "BASKET",
        exchange: "NSE",
        sector: "Diversified",
        tags: ["direct-equity"]
      },
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName.EPFO.id,
        ownerType: "SELF",
        assetClass: "EPF",
        name: "Employee Provident Fund",
        investedAmount: 900000,
        currentValue: 1125000,
        sipAmount: 18000,
        liquidity: "LOW",
        taxCategory: "Retirement",
        metadata: {
          employeeContribution: 540000,
          employerContribution: 540000,
          eps: 45000,
          interestRate: 8.25
        }
      },
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName["NPS CRA"].id,
        ownerType: "SELF",
        assetClass: "NPS",
        name: "NPS Tier I",
        investedAmount: 250000,
        currentValue: 330000,
        sipAmount: 5000,
        liquidity: "LOW",
        taxCategory: "Retirement",
        metadata: {
          equityAllocation: 65,
          corporateDebtAllocation: 20,
          governmentSecuritiesAllocation: 15,
          pensionFundManager: "HDFC Pension",
          tierType: "Tier I"
        }
      },
      {
        userId: user.id,
        ownerId: family.id,
        institutionId: byName["HDFC Bank"].id,
        ownerType: "FAMILY",
        assetClass: "SAVINGS",
        name: "Family Savings Accounts",
        investedAmount: 300000,
        currentValue: 300000,
        liquidity: "HIGH",
        taxCategory: "Savings Interest"
      },
      {
        userId: user.id,
        ownerId: spouse.id,
        institutionId: byName.Manual.id,
        ownerType: "SPOUSE",
        assetClass: "GOLD",
        name: "Physical Gold",
        investedAmount: 280000,
        currentValue: 360000,
        units: 45,
        currentPrice: 8000,
        liquidity: "MEDIUM",
        taxCategory: "Physical Asset",
        metadata: { type: "Physical gold", purity: "22K", storage: "Bank locker" }
      },
      {
        userId: user.id,
        ownerId: family.id,
        institutionId: byName.Manual.id,
        ownerType: "FAMILY",
        assetClass: "PHYSICAL_PLOT",
        name: "Sample Residential Plot",
        investedAmount: 1200000,
        currentValue: 1750000,
        liquidity: "LOW",
        taxCategory: "Real Estate",
        metadata: {
          location: "Sample City",
          ownershipPercentage: 100,
          valuationDate: new Date().toISOString()
        }
      },
      {
        userId: user.id,
        ownerId: self.id,
        institutionId: byName["LIC of India"].id,
        ownerType: "SELF",
        assetClass: "LIC",
        name: "Sample LIC Endowment Policy",
        investedAmount: 180000,
        currentValue: 220000,
        sipAmount: 5000,
        liquidity: "LOW",
        taxCategory: "Insurance",
        metadata: {
          policyMasked: "LIC0000",
          sumAssured: 750000,
          premiumFrequency: "Annual",
          maturityValue: 550000
        }
      }
    ]
  });

  const homeLoan = await prisma.liability.create({
    data: {
      userId: user.id,
      ownerId: family.id,
      institutionId: byName["HDFC Bank"].id,
      ownerType: "FAMILY",
      liabilityClass: "HOME_LOAN",
      lender: "HDFC Bank",
      name: "Home Loan",
      originalAmount: 5500000,
      outstandingAmount: 2500000,
      emi: 35000,
      interestRate: 8.55,
      remainingTenureMonths: 118,
      startDate: new Date("2019-08-01"),
      endDate: new Date("2036-06-01"),
      notes: "Sample housing loan."
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
        liabilityId: homeLoan.id,
        snapshotDate: monthAgo(i),
        outstandingAmount: 2500000 + i * 22000
      }
    });
  }

  await prisma.goal.createMany({
    data: [
      { userId: user.id, name: "₹5Cr Net Worth", targetAmount: 50000000, expectedReturnPercentage: 11, targetDate: new Date("2037-03-31") },
      { userId: user.id, name: "₹10Cr Net Worth", targetAmount: 100000000, expectedReturnPercentage: 11, targetDate: new Date("2043-03-31") },
      { userId: user.id, name: "₹25Cr Net Worth", targetAmount: 250000000, expectedReturnPercentage: 10, targetDate: new Date("2050-03-31") },
      { userId: user.id, name: "Home Loan Closure", targetAmount: 2500000, currentMappedAmount: 0, expectedReturnPercentage: 0, targetDate: new Date("2032-03-31") },
      { userId: user.id, name: "Retirement Corpus", targetAmount: 120000000, expectedReturnPercentage: 10, targetDate: new Date("2048-03-31") },
      { userId: user.id, name: "Child Education Fund", targetAmount: 15000000, expectedReturnPercentage: 9, targetDate: new Date("2040-03-31") }
    ]
  });

  await prisma.importBatch.create({
    data: {
      userId: user.id,
      importType: "GENERIC_CSV",
      fileName: "sample-assets.csv",
      rowCount: 3,
      importedCount: 3,
      status: "IMPORTED",
      mapping: { name: "name", currentValue: "current_value" }
    }
  });

  const dataSources = await Promise.all([
    prisma.dataSource.create({ data: { userId: user.id, provider: "ZERODHA", name: "Zerodha", authType: "OAUTH", status: "CONFIG_REQUIRED", metadata: { note: "Use Kite Connect OAuth/API tokens or upload holdings CSV." } } }),
    prisma.dataSource.create({ data: { userId: user.id, provider: "CAS", name: "CAS / CAMS / KFintech / MFCentral", authType: "FILE_UPLOAD", status: "NOT_CONNECTED", metadata: { note: "Upload CAS statement exports; no broker credentials required." } } }),
    prisma.dataSource.create({ data: { userId: user.id, provider: "NSE", name: "NSE Market Context", authType: "LICENSED_FEED", status: "CONFIG_REQUIRED", metadata: { note: "Use licensed or permitted market feeds. Do not scrape NSE pages." } } }),
    prisma.dataSource.create({ data: { userId: user.id, provider: "LAND_RECORDS", name: "Land / Real Estate", authType: "MANUAL", status: "NOT_CONNECTED", metadata: { note: "Use manual appraisals, circle rates, state portals, or future valuation providers." } } }),
    prisma.dataSource.create({ data: { userId: user.id, provider: "ACCOUNT_AGGREGATOR", name: "Account Aggregator", authType: "CONSENT", status: "CONFIG_REQUIRED", metadata: { note: "Future RBI-regulated consent flow for bank/deposit data." } } })
  ]);

  await prisma.advisorContextItem.createMany({
    data: [
      {
        userId: user.id,
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
        userId: user.id,
        dataSourceId: dataSources[3].id,
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
      userId: user.id,
      action: "SEED_DEMO_PORTFOLIO",
      entityType: "User",
      entityId: user.id,
      metadata: { source: "prisma/seed.ts" }
    }
  });

  console.log(`Seeded demo user ${user.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
