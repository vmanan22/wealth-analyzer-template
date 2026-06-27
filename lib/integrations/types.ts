export type HoldingImportResult = {
  source: string;
  rows: Record<string, unknown>[];
  warnings: string[];
};

export type ConnectorRunResult = {
  importedCount: number;
  updatedCount: number;
  warnings: string[];
};

export type NormalizedContextFact = {
  kind: "HOLDING" | "MARKET_PRICE" | "MF_PORTFOLIO" | "DEBT_LIQUIDITY" | "VALUATION_NOTE" | "WARNING" | "CONNECTOR_STATUS";
  title: string;
  source: string;
  asOfDate: Date;
  confidence: number;
  staleness: "fresh" | "stale" | "manual" | "missing" | "licensed_required";
  payload: Record<string, unknown>;
};

export interface PortfolioIntegration {
  readonly name: string;
  importHoldings(input: ArrayBuffer | string): Promise<HoldingImportResult>;
}

export interface PortfolioConnector {
  readonly provider: string;
  sync(input: string): Promise<ConnectorRunResult>;
}

export interface MarketDataProvider {
  readonly provider: string;
  fetchContext(): Promise<NormalizedContextFact[]>;
}

export interface AdvisorContextProvider {
  buildContext(): Promise<NormalizedContextFact[]>;
}
