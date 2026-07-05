import { Suspense } from "react";
import { ResetPasswordForm } from "./reset-password-form";

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            Checking your reset link\u2026
          </h1>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
