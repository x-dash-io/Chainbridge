import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type DbInstance = PostgresJsDatabase<Record<string, never>>;
