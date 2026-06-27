export type ConsentStatus = "NOT_CONFIGURED" | "PENDING" | "ACTIVE" | "REVOKED";

export async function getAccountAggregatorStatus(): Promise<ConsentStatus> {
  return "NOT_CONFIGURED";
}
