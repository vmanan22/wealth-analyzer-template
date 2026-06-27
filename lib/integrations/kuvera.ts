import type { HoldingImportResult, PortfolioIntegration } from "@/lib/integrations/types";

export class KuveraCsvIntegration implements PortfolioIntegration {
  readonly name = "Kuvera CSV";

  async importHoldings(): Promise<HoldingImportResult> {
    return {
      source: this.name,
      rows: [],
      warnings: ["TODO: map Kuvera/CAS statement rows to mutual fund assets and transactions."]
    };
  }
}
