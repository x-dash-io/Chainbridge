"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RolePicker } from "@/components/ui/role-picker";
import { register, type RegisterState } from "./actions";

const initialState: RegisterState = null;

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(register, initialState);
  const [role, setRole] = useState("");

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create Account</h1>
        <p className="text-sm text-muted">Join the Chainbridge ecosystem.</p>
      </div>

      {state?.error && (
        <p className="rounded-[var(--radius)] border border-badge-error-bg bg-badge-error-bg px-4 py-2 text-sm text-badge-error-fg">
          {state.error}
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          type="text"
          placeholder="Your full name"
          required
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          required
        />
        {state?.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
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
        <Label htmlFor="phone">Phone (optional)</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          placeholder="2547XXXXXXXX"
        />
      </div>

      <input type="hidden" name="role" value={role} />

      <RolePicker
        value={role}
        onChange={setRole}
        error={state?.fieldErrors?.role?.[0]}
      />

      <Button type="submit" variant="primary" disabled={pending} className="mt-1 w-full sm:w-auto">
        {pending ? "Creating account\u2026" : "Create Account"}
      </Button>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
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
