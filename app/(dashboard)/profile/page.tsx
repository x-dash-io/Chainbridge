import { getUser } from "@/lib/auth";
import { db } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "./profile-form";
import { PasswordForm } from "./password-form";

export default async function ProfilePage() {
  const authUser = await getUser();

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!user) {
    return null;
  }

  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-KE", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "N/A";

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">Profile</h1>
        <p className="text-base text-muted">
          Manage your account information and settings.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Account Info</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center gap-4">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-lg font-semibold text-primary-foreground">
                  {user.name.charAt(0)}
                </span>
                <div className="flex flex-col">
                  <span className="text-lg font-medium text-foreground">
                    {user.name}
                  </span>
                  <span className="text-sm text-muted">{user.email}</span>
                </div>
              </div>

              <div className="h-px bg-border" />

              <dl className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted">Role</dt>
                  <dd className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted">
                    {user.role.replace("_", " ")}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted">Verified</dt>
                  <dd>
                    {user.verified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-badge-success-bg px-3 py-1 text-xs font-medium text-badge-success-fg">
                        <svg
                          viewBox="0 0 16 16"
                          fill="none"
                          className="h-3 w-3"
                          aria-hidden
                        >
                          <path
                            d="M4 8l2.5 2.5L12 5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-badge-warning-bg px-3 py-1 text-xs font-medium text-badge-warning-fg">
                        Unverified
                      </span>
                    )}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt className="text-sm text-muted">Member since</dt>
                  <dd className="text-sm text-foreground">{memberSince}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
            </CardHeader>
            <CardContent>
              <PasswordForm email={user.email} />
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Edit Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <ProfileForm
                name={user.name}
                phone={user.phone ?? ""}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
