-- CreateEnum
CREATE TYPE "DataSourceProvider" AS ENUM ('ZERODHA', 'CAS', 'NSE', 'LIC', 'EPFO', 'NPS', 'LAND_RECORDS', 'ACCOUNT_AGGREGATOR', 'MANUAL');

-- CreateEnum
CREATE TYPE "DataSourceStatus" AS ENUM ('NOT_CONNECTED', 'CONNECTED', 'SYNCED', 'ERROR', 'CONFIG_REQUIRED');

-- CreateEnum
CREATE TYPE "DataSourceAuthType" AS ENUM ('OAUTH', 'API_TOKEN', 'FILE_UPLOAD', 'MANUAL', 'CONSENT', 'LICENSED_FEED');

-- CreateEnum
CREATE TYPE "AdvisorContextKind" AS ENUM ('HOLDING', 'MARKET_PRICE', 'MF_PORTFOLIO', 'DEBT_LIQUIDITY', 'VALUATION_NOTE', 'WARNING', 'CONNECTOR_STATUS');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "DataSourceProvider" NOT NULL,
    "name" TEXT NOT NULL,
    "status" "DataSourceStatus" NOT NULL DEFAULT 'NOT_CONNECTED',
    "authType" "DataSourceAuthType" NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT NOT NULL,
    "provider" "DataSourceProvider" NOT NULL,
    "status" "DataSourceStatus" NOT NULL,
    "importedCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "warningCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "warnings" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "symbol" TEXT,
    "isin" TEXT,
    "name" TEXT NOT NULL,
    "exchange" TEXT,
    "assetClass" "AssetClass" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketQuote" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "price" DECIMAL(14,4) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "source" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorContextItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dataSourceId" TEXT,
    "kind" "AdvisorContextKind" NOT NULL,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "asOfDate" TIMESTAMP(3) NOT NULL,
    "confidence" DECIMAL(5,2) NOT NULL,
    "staleness" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdvisorContextItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataSource_userId_provider_key" ON "DataSource"("userId", "provider");
CREATE INDEX "DataSource_userId_status_idx" ON "DataSource"("userId", "status");
CREATE INDEX "SyncRun_userId_startedAt_idx" ON "SyncRun"("userId", "startedAt");
CREATE INDEX "SyncRun_dataSourceId_startedAt_idx" ON "SyncRun"("dataSourceId", "startedAt");
CREATE INDEX "Instrument_userId_assetClass_idx" ON "Instrument"("userId", "assetClass");
CREATE INDEX "Instrument_symbol_idx" ON "Instrument"("symbol");
CREATE INDEX "Instrument_isin_idx" ON "Instrument"("isin");
CREATE INDEX "MarketQuote_instrumentId_asOfDate_idx" ON "MarketQuote"("instrumentId", "asOfDate");
CREATE INDEX "MarketQuote_source_asOfDate_idx" ON "MarketQuote"("source", "asOfDate");
CREATE INDEX "AdvisorContextItem_userId_kind_idx" ON "AdvisorContextItem"("userId", "kind");
CREATE INDEX "AdvisorContextItem_userId_asOfDate_idx" ON "AdvisorContextItem"("userId", "asOfDate");
CREATE INDEX "AdvisorContextItem_dataSourceId_idx" ON "AdvisorContextItem"("dataSourceId");

ALTER TABLE "DataSource" ADD CONSTRAINT "DataSource_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SyncRun" ADD CONSTRAINT "SyncRun_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Instrument" ADD CONSTRAINT "Instrument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketQuote" ADD CONSTRAINT "MarketQuote_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorContextItem" ADD CONSTRAINT "AdvisorContextItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorContextItem" ADD CONSTRAINT "AdvisorContextItem_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
