import { clsx } from "clsx";
import type { ReactNode } from "react";

export function PageHeader({ title, eyebrow, children }: { title: string; eyebrow?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="mb-1 text-sm font-semibold uppercase tracking-wide text-leaf">{eyebrow}</p> : null}
        <h1 className="text-3xl font-bold tracking-normal text-ink">{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx("rounded-lg border border-stone-200 bg-white p-5 shadow-soft", className)}>{children}</section>;
}

export function StatCard({ label, value, helper, tone = "default" }: { label: string; value: string; helper?: string; tone?: "default" | "good" | "warn" | "bad" }) {
  const toneClass = {
    default: "text-ink",
    good: "text-leaf",
    warn: "text-amber",
    bad: "text-coral"
  }[tone];

  return (
    <Card>
      <p className="text-sm font-medium text-stone-500">{label}</p>
      <p className={clsx("mt-2 text-2xl font-bold", toneClass)}>{value}</p>
      {helper ? <p className="mt-2 text-sm text-stone-500">{helper}</p> : null}
    </Card>
  );
}

export function PrimaryButton({ children }: { children: ReactNode }) {
  return <button className="inline-flex items-center justify-center rounded-md bg-leaf px-4 py-2 text-sm font-semibold text-white hover:bg-ink">{children}</button>;
}

export function SecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="inline-flex items-center justify-center rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-stone-50">
      {children}
    </a>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-stone-500">{body}</p>
    </div>
  );
}
