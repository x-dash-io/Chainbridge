import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url || url.trim() === "") {
    throw new Error(
      "Missing required environment variable: DATABASE_URL. Check your .env file.",
    );
  }
  return url;
}

const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

function createConnection() {
  const connectionString = getConnectionString();
  const conn = globalForDb.conn ?? postgres(connectionString, { prepare: false });
  if (process.env.NODE_ENV !== "production") globalForDb.conn = conn;
  return conn;
}

const conn = createConnection();
export const db = drizzle(conn);
