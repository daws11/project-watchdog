import { PgBoss } from "pg-boss";
import { env } from "../config/env";
import { JobTypes } from "./jobs";

let boss: PgBoss | null = null;
const INFRA_QUEUES = ["generate-daily-reports-tick"] as const;

async function ensureQueues(queue: PgBoss): Promise<void> {
  const requiredQueues = [
    JobTypes.PROCESS_BATCH,
    JobTypes.DETECT_RISKS,
    JobTypes.GENERATE_REPORT,
    JobTypes.RUN_PROCESSING_RULE,
    ...INFRA_QUEUES,
  ];

  for (const name of requiredQueues) {
    try {
      await queue.createQueue(name);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!message.toLowerCase().includes("already exists")) {
        throw error;
      }
    }
  }
}

export async function initializeQueue(): Promise<PgBoss> {
  if (boss) {
    return boss;
  }

  boss = new PgBoss({
    connectionString: env.DATABASE_URL,
  });

  boss.on("error", (error: unknown) => {
    console.error("[pg-boss] Error:", error);
  });

  await boss.start();
  await ensureQueues(boss);
  console.log("[pg-boss] Queue initialized");

  return boss;
}

export async function getQueue(): Promise<PgBoss> {
  if (!boss) {
    return initializeQueue();
  }
  return boss;
}

export async function stopQueue(): Promise<void> {
  if (boss) {
    await boss.stop();
    boss = null;
    console.log("[pg-boss] Queue stopped");
  }
}
