"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState } from "@/components/ui/empty-state";
import {
  getAdminUsers,
  searchUsers,
  verifyUserAction,
  type AdminUser,
} from "@/lib/admin/actions";
import { useFormStatus } from "react-dom";

function VerifyButton({ targetUserId, verified }: { targetUserId: string; verified: boolean | null }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      size="sm"
      variant={verified ? "secondary" : "primary"}
      disabled={pending}
    >
      {pending ? (verified ? "Unverifying\u2026" : "Verifying\u2026") : verified ? "Unverify" : "Verify"}
    </Button>
  );
}

function UserRow({ user, onVerified }: { user: AdminUser; onVerified: () => void }) {
  const [state, setState] = useState<{ error?: string; success?: boolean } | null>(null);

  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3 text-sm">{user.name}</td>
      <td className="px-4 py-3 text-sm text-muted">{user.email}</td>
      <td className="px-4 py-3 text-sm text-muted">{user.phone ?? "—"}</td>
      <td className="px-4 py-3">
        <StatusBadge variant="neutral">{user.role.replace("_", " ")}</StatusBadge>
      </td>
      <td className="px-4 py-3">
        <StatusBadge variant={user.verified ? "success" : "neutral"}>
          {user.verified ? "Verified" : "Unverified"}
        </StatusBadge>
      </td>
      <td className="px-4 py-3">
        <form
          action={async (fd) => {
            fd.set("targetUserId", user.id);
            fd.set("verified", String(!user.verified));
            const result = await verifyUserAction(state, fd);
            setState(result);
            if (result?.success) onVerified();
          }}
        >
          <VerifyButton targetUserId={user.id} verified={user.verified} />
          {state?.error && (
            <p className="mt-1 text-xs text-destructive">{state.error}</p>
          )}
        </form>
      </td>
    </tr>
  );
}

export function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = search ? await searchUsers(search) : await getAdminUsers();
      setUsers(data);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Users</CardTitle>
          <Input
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted">Loading users...</p>
        ) : users.length === 0 ? (
          <EmptyState
            title="No users found"
            message={search ? "Try a different search term." : "Users will appear here once they register."}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium uppercase text-muted">
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Phone</th>
                  <th className="px-4 py-2">Role</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <UserRow key={user.id} user={user} onVerified={loadUsers} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
