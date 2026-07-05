"use client";

import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  resetPassword,
  type ResetPasswordState,
} from "@/lib/auth/reset-password";
import { createClient } from "@/lib/supabase/client";

const initialState: ResetPasswordState = null;

export function ResetPasswordForm() {
  const [session, setSession] = useState<boolean | null>(null);
  const [state, formAction, pending] = useActionState(
    resetPassword,
    initialState,
  );
  const [confirmError, setConfirmError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    const code = searchParams.get("code");

    if (!code) {
      supabase.auth
        .getUser()
        .then(({ data, error }) => {
          setSession(!!(data?.user && !error));
        })
        .catch(() => setSession(false));
      return;
    }

    supabase.auth
      .exchangeCodeForSession(code)
      .then(({ data, error }) => {
        if (error || !data.session) {
          setSession(false);
        } else {
          setSession(true);
        }
      })
      .catch(() => setSession(false));
  }, [supabase, searchParams]);

  useEffect(() => {
    if (state?.success) {
      router.push("/login?reset=true");
    }
  }, [state?.success, router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    const confirm = formData.get("confirmPassword") as string;

    if (password !== confirm) {
      e.preventDefault();
      setConfirmError("Passwords do not match.");
      return;
    }
    setConfirmError("");
  }

  if (session === null) {
    return (
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Checking your reset link\u2026
        </h1>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Invalid or Expired Link
          </h1>
          <p className="text-sm text-muted">
            This password reset link is invalid or has expired. Please request
            a new one.
          </p>
        </div>

        <a
          href="/forgot-password"
          className="inline-flex h-10 items-center justify-center rounded-[var(--radius)] bg-primary px-4 text-base font-medium text-primary-foreground transition-all duration-150 hover:bg-[#166B24]"
        >
          Request New Reset Link
        </a>

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
    <form
      action={formAction}
      onSubmit={handleSubmit}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">
          Set New Password
        </h1>
        <p className="text-sm text-muted">
          Choose a new password for your account.
        </p>
      </div>

      {state?.error && (
        <p className="rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          {state.error}
        </p>
      )}

      {confirmError && (
        <p className="rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          {confirmError}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">New Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          required
          minLength={8}
        />
        {state?.fieldErrors?.password && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Repeat your new password"
          required
          minLength={8}
        />
      </div>

      <Button
        type="submit"
        variant="primary"
        disabled={pending}
        className="mt-1 w-full sm:w-auto"
      >
        {pending ? "Resetting\u2026" : "Reset Password"}
      </Button>

      <p className="text-center text-sm text-muted">
        <a
          href="/login"
          className="font-medium text-primary underline underline-offset-2"
        >
          Back to Sign In
        </a>
      </p>
    </form>
  );
}
