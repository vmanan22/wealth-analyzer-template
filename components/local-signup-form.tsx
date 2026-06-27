import { UserPlus } from "lucide-react";
import { createLocalUser } from "@/app/actions";

export function LocalSignUpForm({ message }: { message?: string }) {
  return (
    <details className="mt-5 rounded-lg border border-stone-200 bg-stone-50 p-4">
      <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-ink">
        <UserPlus size={18} className="text-leaf" />
        Create local user
      </summary>
      {message ? <p className="mt-3 rounded-md bg-white px-3 py-2 text-sm text-stone-600">{message}</p> : null}
      <form action={createLocalUser} className="mt-4 grid gap-3">
        <input name="name" type="text" placeholder="Name" aria-label="Name" required />
        <input name="email" type="email" placeholder="Email" aria-label="New user email" required />
        <input name="password" type="password" placeholder="Password, 8+ characters" aria-label="New user password" minLength={8} required />
        <button className="rounded-md border border-leaf bg-white px-4 py-3 text-sm font-semibold text-leaf hover:bg-leaf hover:text-white">
          Sign up local user
        </button>
      </form>
    </details>
  );
}
