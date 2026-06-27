import type { AssetClass } from "@prisma/client";

export const assetClassOptions: { value: AssetClass; label: string; group: string }[] = [
  { value: "STOCK", label: "Stocks", group: "Market investments" },
  { value: "MUTUAL_FUND", label: "Mutual Funds", group: "Market investments" },
  { value: "ETF", label: "ETFs", group: "Market investments" },
  { value: "BOND", label: "Bonds / Debentures", group: "Debt investments" },
  { value: "PMS", label: "PMS", group: "Advanced investments" },
  { value: "AIF", label: "AIF", group: "Advanced investments" },
  { value: "ESOP", label: "ESOPs", group: "Workplace equity" },
  { value: "RSU", label: "RSUs", group: "Workplace equity" },
  { value: "EPF", label: "EPF", group: "Retirement" },
  { value: "NPS", label: "NPS", group: "Retirement" },
  { value: "PPF", label: "PPF", group: "Retirement" },
  { value: "PENSION", label: "Pension / Superannuation", group: "Retirement" },
  { value: "SAVINGS", label: "Savings Account", group: "Cash and deposits" },
  { value: "BANK", label: "Bank Cash", group: "Cash and deposits" },
  { value: "FIXED_DEPOSIT", label: "Fixed Deposit", group: "Cash and deposits" },
  { value: "RECURRING_DEPOSIT", label: "Recurring Deposit (RD)", group: "Cash and deposits" },
  { value: "GOLD", label: "Physical Gold", group: "Gold" },
  { value: "SGB", label: "Sovereign Gold Bond", group: "Gold" },
  { value: "DIGITAL_GOLD", label: "Digital Gold", group: "Gold" },
  { value: "GOLD_ETF", label: "Gold ETF", group: "Gold" },
  { value: "REAL_ESTATE", label: "Real Estate", group: "Physical assets" },
  { value: "PHYSICAL_PLOT", label: "Physical Plot / Land", group: "Physical assets" },
  { value: "VEHICLE", label: "Vehicle", group: "Physical assets" },
  { value: "LIC", label: "LIC Policy", group: "Insurance" },
  { value: "ULIP", label: "ULIP / Insurance Investment", group: "Insurance" },
  { value: "COMMODITY", label: "Other Commodities", group: "Alternatives" },
  { value: "CRYPTO", label: "Crypto", group: "Alternatives" },
  { value: "OTHER", label: "Other Asset", group: "Other" }
];

export function formatAssetClass(value: string) {
  return assetClassOptions.find((option) => option.value === value)?.label ?? value.replaceAll("_", " ");
}
