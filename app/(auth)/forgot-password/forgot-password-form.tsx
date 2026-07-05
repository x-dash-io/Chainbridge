"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  requestPasswordReset,
  type RequestPasswordResetState,
} from "@/lib/auth/request-password-reset";

const initialState: RequestPasswordResetState = null;

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(
    requestPasswordReset,
    initialState,
  );

  if (state?.message) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Check Your Email
          </h1>
          <p className="text-sm text-muted">{state.message}</p>
        </div>
        <p className="text-center text-sm text-muted">
          <a
            href="/login"
            className="font-medium text-primary underline underline-offset-2"
          >
            Back to Sign In
          </a>
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Reset Password
        </h1>
        <p className="text-sm text-muted">
          Enter your email and we&rsquo;ll send you a reset link.
        </p>
      </div>

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

      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className="mt-1 w-full sm:w-auto"
      >
        {pending ? "Sending\u2026" : "Send Reset Link"}
      </Button>

      <p className="text-center text-sm text-muted">
        Remember your password?{" "}
        <a
          href="/login"
          className="font-medium text-primary underline underline-offset-2"
        >
          Sign In
        </a>
      </p>
    </form>
  );
}
