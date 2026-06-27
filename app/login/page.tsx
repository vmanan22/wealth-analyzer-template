import { redirect } from "next/navigation";
import { DemoLoginForm, OAuthButtons } from "@/components/auth-buttons";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  const enabledProviders = [
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "google" : null,
    process.env.APPLE_CLIENT_ID && process.env.APPLE_CLIENT_SECRET ? "apple" : null,
    process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET ? "facebook" : null
  ].filter(Boolean) as string[];

  return (
    <main className="min-h-screen bg-[#f7faf7]">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-6 py-10 lg:grid-cols-[1fr_0.85fr]">
        <section>
          <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Cloud-ready wealth planning</p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-ink md:text-5xl">Wealth Analyzer</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-stone-600">
            A private, multi-user portfolio workspace for Indian households to track assets, liabilities, goals, AI insights, and monthly reports.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {["Portfolio AI", "PDF Reports", "Cloud Portable"].map((item) => (
              <div key={item} className="rounded-lg border border-stone-200 bg-white p-4 shadow-soft">
                <p className="font-semibold">{item}</p>
                <p className="mt-1 text-sm text-stone-500">Built for production use.</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-lg border border-stone-200 bg-white p-6 shadow-soft">
          <h2 className="text-2xl font-bold">Sign in</h2>
          <p className="mt-2 text-sm text-stone-500">Use OAuth in production, or the local demo account while provider secrets are not configured.</p>
          <div className="mt-6">
            <OAuthButtons enabledProviders={enabledProviders} />
          </div>
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-stone-400">Local demo</span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>
          <DemoLoginForm />
        </section>
      </div>
    </main>
  );
}
