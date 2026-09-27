"use client";

import { useState } from "react";
import { claimOwner, signIn, signUp } from "@/server/admin-actions";

export function AuthForms() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formData: FormData) {
    setError(null);
    const result = mode === "in" ? await signIn(formData) : await signUp(formData);
    if (result?.error) setError(result.error);
  }

  return (
    <form action={onSubmit} className="mt-8 grid gap-4">
      {error ? <p role="alert" className="text-sm text-gold-soft">{error}</p> : null}
      <label className="grid gap-2 text-sm text-muted" htmlFor="email">Email
        <input id="email" name="email" type="email" autoComplete="username" required />
      </label>
      <label className="grid gap-2 text-sm text-muted" htmlFor="password">Password
        <input id="password" name="password" type="password" autoComplete={mode === "in" ? "current-password" : "new-password"} minLength={8} required />
      </label>
      <button type="submit" className="min-h-12 bg-gold text-[0.72rem] uppercase tracking-[0.18em] text-ink">
        {mode === "in" ? "Sign in" : "Create account"}
      </button>
      <button type="button" className="text-sm text-muted underline-offset-4 hover:underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
        {mode === "in" ? "First time? Create the owner account" : "Already have an account? Sign in"}
      </button>
    </form>
  );
}

export function SetupForm() {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="mt-8 grid gap-4"
      action={async (formData) => {
        const result = await claimOwner(formData);
        if (result?.error) setError(result.error);
      }}
    >
      {error ? <p role="alert" className="text-sm text-gold-soft">{error}</p> : null}
      <label className="grid gap-2 text-sm text-muted" htmlFor="setupKey">Setup key
        <input id="setupKey" name="setupKey" type="password" required autoComplete="off" />
      </label>
      <button type="submit" className="min-h-12 bg-gold text-[0.72rem] uppercase tracking-[0.18em] text-ink">Link this account</button>
    </form>
  );
}
