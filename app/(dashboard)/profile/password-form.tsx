"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type PasswordFormProps = {
  email: string;
};

export function PasswordForm({ email }: PasswordFormProps) {
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    changePassword,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="email" value={email} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="currentPassword">Current Password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          required
          aria-invalid={!!state?.fieldErrors?.currentPassword}
        />
        {state?.fieldErrors?.currentPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.currentPassword[0]}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          required
          minLength={8}
          aria-invalid={!!state?.fieldErrors?.newPassword}
        />
        {state?.fieldErrors?.newPassword && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.newPassword[0]}
          </p>
        )}
      </div>

      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-success">Password changed successfully.</p>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Updating\u2026" : "Change Password"}
      </Button>
    </form>
  );
}
