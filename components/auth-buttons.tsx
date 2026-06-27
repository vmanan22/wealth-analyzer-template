"use client";

import { signIn, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function OAuthButtons({ enabledProviders }: { enabledProviders: string[] }) {
  const buttonClass = "rounded-md border border-stone-300 bg-white px-4 py-3 text-sm font-semibold text-ink hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div className="grid gap-3">
      <button disabled={!enabledProviders.includes("google")} onClick={() => signIn("google", { callbackUrl: "/dashboard" })} className={buttonClass}>
        Continue with Google
      </button>
      <button disabled={!enabledProviders.includes("apple")} onClick={() => signIn("apple", { callbackUrl: "/dashboard" })} className="rounded-md bg-ink px-4 py-3 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-50">
        Continue with Apple
      </button>
      <button disabled={!enabledProviders.includes("facebook")} onClick={() => signIn("facebook", { callbackUrl: "/dashboard" })} className="rounded-md bg-sky px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
        Continue with Facebook
      </button>
    </div>
  );
}

export function DemoLoginForm() {
  return (
    <form
      className="mt-4 grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        signIn("credentials", {
          email: formData.get("email"),
          password: formData.get("password"),
          callbackUrl: "/dashboard"
        });
      }}
    >
      <input name="email" type="email" defaultValue="demo@wealth.local" aria-label="Email" />
      <input name="password" type="password" defaultValue="password123" aria-label="Password" />
      <button className="rounded-md bg-leaf px-4 py-3 text-sm font-semibold text-white hover:bg-ink">Sign in with credentials</button>
    </form>
  );
}

export function SignOutButton() {
  return (
    <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100">
      <LogOut size={18} />
      Sign out
    </button>
  );
}
