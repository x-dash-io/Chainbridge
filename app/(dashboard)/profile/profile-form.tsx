"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "./actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

type ProfileFormProps = {
  name: string;
  phone: string;
};

export function ProfileForm({ name, phone }: ProfileFormProps) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfile,
    null,
  );

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          required
          aria-invalid={!!state?.fieldErrors?.name}
        />
        {state?.fieldErrors?.name && (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">Phone</Label>
        <Input
          id="phone"
          name="phone"
          type="tel"
          defaultValue={phone}
          aria-invalid={!!state?.fieldErrors?.phone}
        />
        {state?.fieldErrors?.phone && (
          <p className="text-xs text-destructive">{state.fieldErrors.phone[0]}</p>
        )}
      </div>

      {state?.error && !state.fieldErrors && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}

      {state?.success && (
        <p className="text-sm text-success">Profile updated successfully.</p>
      )}

      <Button type="submit" variant="primary" disabled={pending}>
        {pending ? "Saving\u2026" : "Save Changes"}
      </Button>
    </form>
  );
}
