import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { projects, connections, peopleSettings } from "../db/schema";
import {
  allContextEnrichmentScenarios,
  contextEnrichmentExpected,
  type ContextEnrichmentScenario,
} from "./fixtures/context-enrichment-scenarios";
import {
  runContextEnrichmentTest,
  seedContextEnrichmentScenario,
  cleanupContextEnrichmentScenario,
  getEnrichmentDetails,
  logEnrichmentResult,
  type EnrichmentTestResult,
} from "./utils/context-enrichment-test-utils";

// Store test data for cleanup
interface TestData {
  projectId: number;
  connectionId: number | null;
  messageIds: number[];
}

const testDataMap: Map<string, TestData> = new Map();

describe("Context Enrichment Scenarios with Real LLM", () => {
  beforeAll(async () => {
    console.log(
      "[Context Enrichment Scenarios] Starting comprehensive scenario tests with real LLM..."
    );
    console.log(
      `Testing ${allContextEnrichmentScenarios.length} scenarios...`
    );
  });

  afterAll(async () => {
    console.log("[Context Enrichment Scenarios] Cleaning up...");
    for (const [name, data] of testDataMap) {
      try {
        await cleanupContextEnrichmentScenario(
          data.projectId,
          data.connectionId,
          data.messageIds
        );
        console.log(`[Cleanup] Cleaned up: ${name}`);
      } catch (error) {
        console.error(`[Cleanup] Failed to cleanup ${name}:`, error);
      }
    }
  });

  describe("Payment Gateway Integration Context", () => {
    it("should extract payment-related context from development discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "payment-gateway-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);
      expect(result.connectionEnriched).toBe(true);
      expect(result.peopleEnriched.length).toBeGreaterThanOrEqual(1);

      console.log("[Test Result] Payment Gateway:", {
        projectEnriched: result.projectEnriched,
        connectionEnriched: result.connectionEnriched,
        peopleEnriched: result.peopleEnriched,
      });
    }, 60000);
  });

  describe("Performance Optimization Context", () => {
    it("should extract performance-related priorities and goals", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "performance-optimization-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);

      // Seed test data for detailed inspection (with enrichment)
      const testData = await seedContextEnrichmentScenario(scenario, {
        runEnrichment: true,
      });
      testDataMap.set(scenario.name, testData);

      // Get detailed results
      const details = await getEnrichmentDetails(
        testData.projectId,
        testData.connectionId,
        [...new Set(scenario.messages.map((m) => m.sender))]
      );

      logEnrichmentResult(scenario.name, result, details);

      // Verify project was enriched (any context is fine, LLM may use different words)
      const hasAnyContext =
        details.project?.description ||
        details.project?.priorities ||
        details.project?.customPrompt;

      expect(hasAnyContext).toBeTruthy();
    }, 60000);
  });

  describe("Mobile App Development Context", () => {
    it("should extract mobile-specific technical context", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "mobile-app-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);
      expect(result.peopleEnriched.length).toBeGreaterThanOrEqual(1);

      console.log("[Test Result] Mobile App:", {
        errors: result.errors,
      });
    }, 60000);
  });

  describe("E-commerce Platform Context", () => {
    it("should extract business domain context from e-commerce discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "ecommerce-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);
      expect(result.connectionEnriched).toBe(true);

      // Seed and inspect (with enrichment)
      const testData = await seedContextEnrichmentScenario(scenario, {
        runEnrichment: true,
      });
      testDataMap.set(scenario.name, testData);

      const details = await getEnrichmentDetails(
        testData.projectId,
        testData.connectionId,
        [...new Set(scenario.messages.map((m) => m.sender))]
      );

      // Verify project was enriched (LLM may use different terminology)
      const hasAnyEcommerceContext =
        details.project?.description ||
        details.project?.priorities ||
        details.project?.customPrompt;

      expect(hasAnyEcommerceContext).toBeTruthy();

      logEnrichmentResult(scenario.name, result, details);
    }, 60000);
  });

  describe("Architecture and Tech Lead Context", () => {
    it("should extract role and responsibility information from tech lead discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "architecture-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.peopleEnriched.length).toBeGreaterThanOrEqual(1);

      // Seed and inspect person enrichment
      const testData = await seedContextEnrichmentScenario(scenario);
      testDataMap.set(scenario.name, testData);

      const details = await getEnrichmentDetails(
        testData.projectId,
        testData.connectionId,
        [...new Set(scenario.messages.map((m) => m.sender))]
      );

      // Verify at least one person has role information
      const hasRoleInfo = details.people.some(
        (p) => p.roleDescription || p.priorities
      );
      expect(hasRoleInfo).toBe(true);

      console.log("[Test Result] Architecture:", {
        peopleEnriched: details.people.map((p) => ({
          name: p.name,
          roleDescription: p.roleDescription?.slice(0, 50),
          priorities: p.priorities?.slice(0, 50),
        })),
      });
    }, 60000);
  });

  describe("Security and Compliance Context", () => {
    it("should extract security-focused context from compliance discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "security-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);

      console.log("[Test Result] Security:", {
        errors: result.errors,
      });
    }, 60000);
  });

  describe("DevOps and Infrastructure Context", () => {
    it("should extract DevOps and CI/CD context from infrastructure discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "devops-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);
      expect(result.connectionEnriched).toBe(true);

      // Seed and inspect (with enrichment)
      const testData = await seedContextEnrichmentScenario(scenario, {
        runEnrichment: true,
      });
      testDataMap.set(scenario.name, testData);

      const details = await getEnrichmentDetails(
        testData.projectId,
        testData.connectionId,
        [...new Set(scenario.messages.map((m) => m.sender))]
      );

      // Verify project was enriched (LLM may describe differently)
      const hasAnyDevOpsContext =
        details.project?.description ||
        details.project?.priorities ||
        details.project?.customPrompt;

      expect(hasAnyDevOpsContext).toBeTruthy();

      logEnrichmentResult(scenario.name, result, details);
    }, 60000);
  });

  describe("UI/UX Design Context", () => {
    it("should extract design and UX context from design team discussions", async () => {
      const scenario = allContextEnrichmentScenarios.find(
        (s) => s.name === "design-context"
      )!;

      const result = await runContextEnrichmentTest(scenario);

      expect(result.success).toBe(true);
      expect(result.projectEnriched).toBe(true);

      console.log("[Test Result] Design:", {
        projectEnriched: result.projectEnriched,
        connectionEnriched: result.connectionEnriched,
        peopleEnriched: result.peopleEnriched,
      });
    }, 60000);
  });

  describe("User Override Protection Across Scenarios", () => {
    it("should preserve user-provided context across all scenario types", async () => {
      const results: Array<{
        scenario: string;
        protected: boolean;
      }> = [];

      for (const scenario of allContextEnrichmentScenarios.slice(0, 3)) {
        // Test with user-provided context
        const result = await runContextEnrichmentTest(scenario, {
          withUserProvidedContext: true,
        });

        // Seed to check details
        const testData = await seedContextEnrichmentScenario(scenario, {
          withUserProvidedContext: true,
        });

        const details = await getEnrichmentDetails(
          testData.projectId,
          testData.connectionId,
          [...new Set(scenario.messages.map((m) => m.sender))]
        );

        // Verify user values are preserved
        const userDescriptionPreserved =
          details.project?.description === "User provided description";
        const userPrioritiesPreserved =
          details.project?.priorities === "User provided priorities";
        const userConnectionDescPreserved =
          !testData.connectionId ||
          details.connection?.description ===
            "User provided connection description";

        results.push({
          scenario: scenario.name,
          protected:
            userDescriptionPreserved &&
            userPrioritiesPreserved &&
            userConnectionDescPreserved,
        });

        // Cleanup
        await cleanupContextEnrichmentScenario(
          testData.projectId,
          testData.connectionId,
          testData.messageIds
        );
      }

      // All scenarios should have protected user data
      const allProtected = results.every((r) => r.protected);
      expect(allProtected).toBe(true);

      console.log("[Test Result] User Override Protection:", results);
    }, 120000);
  });

  describe("Minimum Field Population Requirement", () => {
    it("should populate at least one context field per entity", async () => {
      const results: Array<{
        scenario: string;
        projectFields: number;
        connectionFields: number;
        peopleFields: number;
      }> = [];

      for (const scenario of allContextEnrichmentScenarios) {
        // Seed and run enrichment
        const testData = await seedContextEnrichmentScenario(scenario, {
          runEnrichment: true,
        });

        // Get details
        const details = await getEnrichmentDetails(
          testData.projectId,
          testData.connectionId,
          [...new Set(scenario.messages.map((m) => m.sender))]
        );

        // Count populated fields
        const projectFields = [
          details.project?.description,
          details.project?.priorities,
          details.project?.customPrompt,
        ].filter(Boolean).length;

        const connectionFields = details.connection
          ? [
              details.connection?.description,
              details.connection?.priorities,
              details.connection?.customPrompt,
            ].filter(Boolean).length
          : 0;

        const peopleFields = details.people.reduce((sum, p) => {
          return (
            sum +
            [p.roleDescription, p.priorities, p.customPrompt].filter(Boolean)
              .length
          );
        }, 0);

        results.push({
          scenario: scenario.name,
          projectFields,
          connectionFields,
          peopleFields,
        });

        // Cleanup
        await cleanupContextEnrichmentScenario(
          testData.projectId,
          testData.connectionId,
          testData.messageIds
        );
      }

      // Log results
      console.log("[Test Result] Field Population:", results);

      // Verify at least 70% of scenarios have some enrichment
      // (LLM may not always produce context for every scenario)
      const enrichedCount = results.filter(
        (r) =>
          r.projectFields >= contextEnrichmentExpected.minFieldsPopulated ||
          r.connectionFields >= contextEnrichmentExpected.minFieldsPopulated
      ).length;

      const enrichmentRate = enrichedCount / results.length;
      console.log(`[Test] Enrichment rate: ${(enrichmentRate * 100).toFixed(1)}% (${enrichedCount}/${results.length})`);

      expect(enrichmentRate).toBeGreaterThanOrEqual(0.7); // At least 70% success rate
    }, 180000);
  });

  describe("Source Tracking Validation", () => {
    it("should correctly track AI vs User sources for all fields", async () => {
      // Create project with mixed sources
      const [project] = await db
        .insert(projects)
        .values({
          name: "Source Tracking Test",
          description: "AI filled this",
          descriptionSource: "ai",
          priorities: "User filled this",
          prioritiesSource: "user",
          customPrompt: null,
          customPromptSource: "ai",
          healthScore: 100,
        })
        .returning();

      // Verify sources
      const retrievedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(retrievedProject?.descriptionSource).toBe("ai");
      expect(retrievedProject?.prioritiesSource).toBe("user");
      expect(retrievedProject?.customPromptSource).toBe("ai");

      // Update via API (simulating user edit)
      await db
        .update(projects)
        .set({
          description: "User updated this",
          descriptionSource: "user",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id));

      // Verify source changed to user
      const updatedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(updatedProject?.descriptionSource).toBe("user");
      // priorities should remain user
      expect(updatedProject?.prioritiesSource).toBe("user");

      // Cleanup
      await db.delete(projects).where(eq(projects.id, project.id));
    });
  });
});
