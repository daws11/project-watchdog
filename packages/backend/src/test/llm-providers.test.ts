import {
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { llmProviders } from "../db/schema";
import {
  ADVANCED_MODEL,
  DEFAULT_MODEL,
  invalidateProviderCache,
  resolveActiveProvider,
} from "../services/llm";
import { encryptSecret } from "../utils/crypto";
import { seedLlmProvidersFromEnv } from "../db/seeds/seed-llm-providers";

// These tests exercise the resolver against the real DB. They isolate rows
// via a registry + afterEach cleanup so failures never leave orphan rows.
// Any pre-existing active provider (from startup seed or prior work) is
// deactivated for the test and restored afterwards.
describe("llm providers service", () => {
  const createdIds: number[] = [];
  let preExistingActiveId: number | null = null;

  async function insertProvider(input: {
    name: string;
    baseUrl?: string | null;
    apiKey: string;
    defaultModel: string;
    advancedModel: string;
    isActive?: boolean;
  }) {
    const enc = encryptSecret(input.apiKey);
    const [row] = await db
      .insert(llmProviders)
      .values({
        name: input.name,
        baseUrl: input.baseUrl ?? null,
        encryptedApiKey: enc.encryptedValue,
        iv: enc.iv,
        authTag: enc.authTag,
        maskedKey: `...${input.apiKey.slice(-4)}`,
        defaultModel: input.defaultModel,
        advancedModel: input.advancedModel,
        isActive: input.isActive ?? false,
      })
      .returning();
    createdIds.push(row.id);
    return row;
  }

  beforeEach(async () => {
    // Snapshot + deactivate any existing active row so tests can freely
    // create their own active row without colliding with the partial
    // unique index.
    const [existing] = await db
      .select({ id: llmProviders.id })
      .from(llmProviders)
      .where(eq(llmProviders.isActive, true))
      .limit(1);
    if (existing) {
      preExistingActiveId = existing.id;
      await db
        .update(llmProviders)
        .set({ isActive: false })
        .where(eq(llmProviders.id, existing.id));
    } else {
      preExistingActiveId = null;
    }
    invalidateProviderCache();
  });

  afterEach(async () => {
    if (createdIds.length > 0) {
      await db.delete(llmProviders).where(inArray(llmProviders.id, [...createdIds]));
      createdIds.length = 0;
    }
    // Restore pre-existing active provider, if any.
    if (preExistingActiveId != null) {
      try {
        await db
          .update(llmProviders)
          .set({ isActive: true })
          .where(eq(llmProviders.id, preExistingActiveId));
      } catch {
        // If the row no longer exists or restore fails, ignore — the next
        // beforeEach will handle whatever state the DB is in.
      }
      preExistingActiveId = null;
    }
    invalidateProviderCache();
  });

  afterAll(async () => {
    if (createdIds.length > 0) {
      await db.delete(llmProviders).where(inArray(llmProviders.id, [...createdIds]));
    }
  });

  describe("sentinel constants", () => {
    it("DEFAULT_MODEL and ADVANCED_MODEL are distinct sentinel strings", () => {
      expect(DEFAULT_MODEL).not.toBe(ADVANCED_MODEL);
      expect(DEFAULT_MODEL).toMatch(/^__/);
      expect(ADVANCED_MODEL).toMatch(/^__/);
    });
  });

  describe("resolveActiveProvider", () => {
    it("returns the DB row when one is active", async () => {
      const row = await insertProvider({
        name: "Test Active Provider",
        baseUrl: "https://example.test/v1",
        apiKey: "sk-test-active-1234567890",
        defaultModel: "test-default",
        advancedModel: "test-advanced",
        isActive: true,
      });

      const resolved = await resolveActiveProvider();
      expect(resolved.source).toBe("db");
      expect(resolved.id).toBe(row.id);
      expect(resolved.name).toBe("Test Active Provider");
      expect(resolved.baseUrl).toBe("https://example.test/v1");
      expect(resolved.defaultModel).toBe("test-default");
      expect(resolved.advancedModel).toBe("test-advanced");
      // Decrypted successfully:
      expect(resolved.apiKey).toBe("sk-test-active-1234567890");
    });

    it("falls back to env when no row is active", async () => {
      await insertProvider({
        name: "Inactive Provider",
        apiKey: "sk-inactive-0000000000",
        defaultModel: "x",
        advancedModel: "y",
        isActive: false,
      });

      const resolved = await resolveActiveProvider();
      expect(resolved.source).toBe("env");
    });

    it("caches the resolved provider within the TTL", async () => {
      const row = await insertProvider({
        name: "Cached Provider",
        apiKey: "sk-cached-1234567890",
        defaultModel: "m-1",
        advancedModel: "m-2",
        isActive: true,
      });

      const first = await resolveActiveProvider();
      expect(first.id).toBe(row.id);

      // Deactivate without invalidating the cache — cached value must still win.
      await db
        .update(llmProviders)
        .set({ isActive: false })
        .where(eq(llmProviders.id, row.id));
      const second = await resolveActiveProvider();
      expect(second.id).toBe(row.id); // still cached
      expect(second.source).toBe("db");

      // Invalidate, next call should reflect the new state.
      invalidateProviderCache();
      const third = await resolveActiveProvider();
      expect(third.source).toBe("env"); // fell through to env since no active row
    });

    it("respects activation exclusivity via the partial unique index", async () => {
      const first = await insertProvider({
        name: "First",
        apiKey: "sk-first-12345678",
        defaultModel: "m",
        advancedModel: "m",
        isActive: true,
      });

      // Trying to insert a second active row directly must fail.
      await expect(
        insertProvider({
          name: "Second",
          apiKey: "sk-second-12345678",
          defaultModel: "m",
          advancedModel: "m",
          isActive: true,
        }),
      ).rejects.toThrow();

      // Sanity: the first row is still the only active one.
      const activeRows = await db
        .select()
        .from(llmProviders)
        .where(eq(llmProviders.isActive, true));
      expect(activeRows.length).toBe(1);
      expect(activeRows[0].id).toBe(first.id);
    });
  });

  describe("seedLlmProvidersFromEnv", () => {
    it("is a no-op when the table already has rows", async () => {
      await insertProvider({
        name: "Existing",
        apiKey: "sk-existing-123456",
        defaultModel: "m",
        advancedModel: "m",
      });

      const before = await db.select({ id: llmProviders.id }).from(llmProviders);
      await seedLlmProvidersFromEnv();
      const after = await db.select({ id: llmProviders.id }).from(llmProviders);
      // No new rows were inserted by the seed.
      expect(after.length).toBe(before.length);
    });
  });
});
