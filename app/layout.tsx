import type { Metadata } from "next";
import { BarChart3, Brain, FileText, Landmark, LineChart, PiggyBank, Settings, ShieldCheck, Target, Upload, WalletCards } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/auth-buttons";
import { getCurrentUser } from "@/lib/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wealth Analyzer",
  description: "Personal balance sheet and wealth portfolio analyzer for Indian households."
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/assets", label: "Assets", icon: WalletCards },
  { href: "/liabilities", label: "Liabilities", icon: Landmark },
  { href: "/imports", label: "Imports", icon: Upload },
  { href: "/snapshots", label: "Snapshots", icon: LineChart },
  { href: "/goals", label: "Goals", icon: Target },
  { href: "/advisor", label: "Advisor", icon: Brain },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/analytics", label: "Analytics", icon: PiggyBank },
  { href: "/settings", label: "Settings", icon: Settings }
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body>
        {!user ? children : (
        <div className="flex min-h-screen">
          <aside className="hidden w-64 border-r border-stone-200 bg-white/85 px-4 py-5 backdrop-blur lg:block">
            <Link href="/dashboard" className="mb-7 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-md bg-leaf text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <p className="text-base font-bold">Wealth Analyzer</p>
                <p className="text-xs text-stone-500">Family balance sheet</p>
              </div>
            </Link>
            <nav className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-mint hover:text-ink"
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            {user ? (
              <div className="mt-8 border-t border-stone-200 pt-4">
                <p className="mb-2 truncate px-3 text-xs text-stone-500">{user.email}</p>
                <SignOutButton />
              </div>
            ) : null}
          </aside>
          <main className="min-w-0 flex-1">
            <div className="border-b border-stone-200 bg-white/75 px-4 py-3 backdrop-blur lg:hidden">
              <div className="flex gap-3 overflow-x-auto">
                {nav.map((item) => (
                  <Link key={item.href} href={item.href} className="whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold">
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            {children}
          </main>
        </div>
        )}
      </body>
    </html>
  );
}
