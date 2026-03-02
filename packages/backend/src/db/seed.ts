import bcrypt from "bcrypt";
import { eq, or } from "drizzle-orm";
import "../config/dotenv";
import { db } from "./index";
import { users } from "./schema/users";

const DEFAULT_ADMIN_EMAIL = "admin@watchdog.local";
const DEFAULT_ADMIN_NAME = "Watchdog Admin";

const seedAdminEmailRaw = (process.env.SEED_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).trim();
const seedAdminEmail = seedAdminEmailRaw.toLowerCase();
const seedAdminName = (process.env.SEED_ADMIN_NAME || DEFAULT_ADMIN_NAME).trim();
const seedAdminPassword = process.env.SEED_ADMIN_PASSWORD;

const run = async () => {
  if (!seedAdminPassword) {
    throw new Error(
      "SEED_ADMIN_PASSWORD is required to run db:seed. " +
        "Set it in .env/.env.local before seeding.",
    );
  }

  const passwordHash = await bcrypt.hash(seedAdminPassword, 10);
  const now = new Date();

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(
      or(eq(users.email, seedAdminEmail), eq(users.email, seedAdminEmailRaw)),
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(users)
      .set({
        name: seedAdminName,
        email: seedAdminEmail,
        passwordHash,
        role: "admin",
        sectionPermissions: [],
        assignedPeopleIds: [],
        active: true,
      })
      .where(
        or(eq(users.email, seedAdminEmail), eq(users.email, seedAdminEmailRaw)),
      );

    console.log(`[seed] Updated existing admin user: ${seedAdminEmail}`);
    return;
  }

  await db.insert(users).values({
    name: seedAdminName,
    email: seedAdminEmail,
    passwordHash,
    role: "admin",
    sectionPermissions: [],
    assignedPeopleIds: [],
    active: true,
    createdAt: now,
  });

  console.log(`[seed] Created admin user: ${seedAdminEmail}`);
};

run()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("[seed] Failed:", error);
    process.exit(1);
  });
