import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/lib/auth";

export function isAdmin(role: string): boolean {
  return role === "admin";
}

export function isConsumerOrRetailer(role: string): boolean {
  return role === "consumer" || role === "retailer";
}

export function isRetailer(role: string): boolean {
  return role === "retailer";
}

export function isProducer(role: string): boolean {
  return role === "producer";
}

export function isServiceProvider(role: string): boolean {
  return ["producer", "processor", "packer", "delivery_agent"].includes(role);
}

export type AuthorizedUser = AuthUser;

export function requireAdmin(user: AuthorizedUser): asserts user is AuthorizedUser {
  if (!isAdmin(user.role)) {
    throw new Error("Admin authorization required");
  }
}

export function requireConsumerOrRetailer(user: AuthorizedUser): asserts user is AuthorizedUser {
  if (!isConsumerOrRetailer(user.role)) {
    throw new Error("Only consumers and retailers can perform this action");
  }
}

export function requireRetailer(user: AuthorizedUser): asserts user is AuthorizedUser {
  if (!isRetailer(user.role)) {
    throw new Error("Only retailers can perform this action");
  }
}

export async function requireAdminPage(): Promise<AuthorizedUser> {
  const user = await getUser();
  if (!isAdmin(user.role)) {
    const dashPath = user.role === "delivery_agent" ? "delivery" : user.role;
    redirect(`/${dashPath}`);
  }
  return user;
}

export async function requireConsumerOrRetailerPage(
  errorMessage = "Only consumers and retailers can perform this action",
): Promise<AuthorizedUser> {
  const user = await getUser();
  if (!isConsumerOrRetailer(user.role)) {
    throw new Error(errorMessage);
  }
  return user;
}

export function requireProducer(user: AuthorizedUser): asserts user is AuthorizedUser {
  if (!isProducer(user.role)) {
    throw new Error("Only producers can perform this action");
  }
}

export async function requireRetailerPage(): Promise<AuthorizedUser> {
  const user = await getUser();
  if (!isRetailer(user.role)) {
    throw new Error("Only retailers can perform this action");
  }
  return user;
}
