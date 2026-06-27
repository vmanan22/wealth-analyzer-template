export function formatRupees(value: number, options?: { compact?: boolean }) {
  if (options?.compact) {
    const abs = Math.abs(value);
    if (abs >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (!value) return 0;
  return Number(value);
}

export function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

export function maskIdentifier(value?: string | null) {
  if (!value) return "";
  const visible = value.slice(-4);
  return `•••• ${visible}`;
}
