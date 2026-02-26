import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../config/env";
import * as schema from "./schema";

const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === "production" ? 20 : 10,
  ssl: false,
});

export const db = drizzle(client, { schema });

export const checkDatabaseHealth = async (): Promise<boolean> => {
  try {
    await client`select 1 as health_check`;
    return true;
  } catch {
    return false;
  }
};
