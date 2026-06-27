export type HoldingImportResult = {
  source: string;
  rows: Record<string, unknown>[];
  warnings: string[];
};

export interface PortfolioIntegration {
  readonly name: string;
  importHoldings(input: ArrayBuffer | string): Promise<HoldingImportResult>;
}
