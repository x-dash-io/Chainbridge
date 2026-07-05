"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

const initialState: LoginState = null;

export function LoginForm({
  registered,
  reset,
}: {
  registered?: boolean;
  reset?: boolean;
}) {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign In</h1>
        <p className="text-sm text-muted">Welcome back to Chainbridge.</p>
      </div>

      {registered && (
        <p className="rounded-[var(--radius)] border border-badge-success-bg bg-badge-success-bg px-4 py-2 text-sm text-badge-success-fg">
          Account created! Check your email for a confirmation link before
          signing in.
        </p>
      )}

      {reset && (
        <p className="rounded-[var(--radius)] border border-badge-success-bg bg-badge-success-bg px-4 py-2 text-sm text-badge-success-fg">
          Password reset successfully! Sign in with your new password.
        </p>
      )}

      {state?.error && (
        <p className="rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <a
            href="/forgot-password"
            className="text-xs font-medium text-primary underline underline-offset-2"
          >
            Forgot password?
          </a>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
          required
        />
      </div>

      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full sm:w-auto">
        {pending ? "Signing in\u2026" : "Sign In"}
      </Button>

      <p className="text-center text-sm text-muted">
        No account?{" "}
        <a
          href="/register"
          className="font-medium text-primary underline underline-offset-2"
        >
          Register
        </a>
      </p>
    </form>
  );
}
