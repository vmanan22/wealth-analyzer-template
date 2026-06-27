import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";

export class ZerodhaCsvIntegration implements PortfolioIntegration {
  readonly name = "Zerodha CSV";

  async importHoldings(): Promise<HoldingImportResult> {
    return {
      source: this.name,
      rows: [],
      warnings: ["TODO: map Zerodha holdings CSV columns to stock assets. Kite Connect can be added later with OAuth/API tokens."]
    };
  }
}
