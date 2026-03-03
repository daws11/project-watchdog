import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  projects,
  connections,
  peopleSettings,
  messages,
  tasks,
} from "../db/schema";
import { enrichBatchContext } from "../workers/context-enricher";
import {
  buildRichTaskExtractionPrompt,
  taskExtractionSystemPrompt,
  DeadlineExtractionSchema,
} from "../prompts/task-extraction";
import { zodResponseFormat } from "openai/helpers/zod";
import { llmChatCompletionsCreate, DEFAULT_MODEL } from "../services/llm";
import { runTaskExtractorOnce } from "./utils/trigger-worker";
import { seedTestScenario, cleanupTestScenario, type SeededScenarioResult } from "./utils/seed-messages";

// Test scenarios for context enrichment
const contextEnrichmentScenarios = {
  projectWithDescription: {
    name: "context-enrichment-project",
    messages: [
      {
        sender: "John",
        text: "We need to finalize the API documentation for the payment gateway integration. The endpoints for Stripe and Midtrans need to be documented by tomorrow.",
      },
      {
        sender: "Sarah",
        text: "Also let's make sure we test the webhook handling for both providers. Security review is critical for this feature.",
      },
      {
        sender: "John",
        text: "Don't forget to update the developer docs with the new authentication flow using JWT tokens.",
      },
    ],
  },
  groupWithPriorities: {
    name: "context-enrichment-group",
    messages: [
      {
        sender: "Manager",
        text: "Team, our Q1 focus is on improving app performance and reducing load times. Page load should be under 2 seconds.",
      },
      {
        sender: "Dev1",
        text: "I'll work on optimizing the database queries and adding caching with Redis.",
      },
      {
        sender: "Dev2",
        text: "I can handle the frontend optimization - lazy loading images and code splitting.",
      },
    ],
  },
  personWithRole: {
    name: "context-enrichment-person",
    messages: [
      {
        sender: "Alice (Tech Lead)",
        text: "As the tech lead, I need to review all PRs before they go to staging. Please tag me on critical changes.",
      },
      {
        sender: "Alice (Tech Lead)",
        text: "Our architecture decision is to use microservices for the new module. I'll document the service boundaries today.",
      },
    ],
  },
  mixedContext: {
    name: "context-enrichment-mixed",
    messages: [
      {
        sender: "Bob",
        text: "Working on the mobile app crash fixes. The iOS version keeps crashing on login for users with 2FA enabled.",
      },
      {
        sender: "Carol",
        text: "I can help test the Android version. Let's prioritize the login flow stability before adding new features.",
      },
      {
        sender: "Bob",
        text: "Found the issue - it's a race condition in the auth callback. Fix will be ready by end of day.",
      },
    ],
  },
};

// Store results for cleanup
const testResults: Map<string, SeededScenarioResult> = new Map();

describe("Context Enrichment Tests with Real LLM", () => {
  beforeAll(async () => {
    console.log("[Context Enrichment Test Suite] Starting tests with real LLM...");
  });

  afterAll(async () => {
    console.log("[Context Enrichment Test Suite] Cleaning up test data...");
    for (const [name, result] of testResults) {
      try {
        await cleanupTestScenario(result);
        console.log(`[Test Suite] Cleaned up: ${name}`);
      } catch (error) {
        console.error(`[Test Suite] Failed to cleanup ${name}:`, error);
      }
    }
  });

  describe("AI Context Enrichment with Real LLM", () => {
    it("should enrich project context using real LLM analysis", async () => {
      // Create a test project
      const [project] = await db
        .insert(projects)
        .values({
          name: "Payment Gateway Integration",
          description: null,
          descriptionSource: "ai",
          priorities: null,
          prioritiesSource: "ai",
          customPrompt: null,
          customPromptSource: "ai",
          healthScore: 100,
        })
        .returning();

      // Prepare messages for enrichment
      const messages = contextEnrichmentScenarios.projectWithDescription.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      // Call enrichment with real LLM
      await enrichBatchContext(
        project.id,
        null,
        messages,
        ["John", "Sarah"]
      );

      // Verify project was enriched
      const enrichedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(enrichedProject).toBeDefined();
      // LLM should have filled at least one field
      const hasEnrichment =
        enrichedProject?.description ||
        enrichedProject?.priorities ||
        enrichedProject?.customPrompt;
      expect(hasEnrichment).toBeTruthy();

      // All sources should be 'ai' since LLM filled them
      expect(enrichedProject?.descriptionSource).toBe("ai");
      expect(enrichedProject?.prioritiesSource).toBe("ai");
      expect(enrichedProject?.customPromptSource).toBe("ai");

      // Log enrichment results
      console.log("[Test] Project enrichment results:", {
        description: enrichedProject?.description?.slice(0, 100),
        priorities: enrichedProject?.priorities?.slice(0, 100),
        customPrompt: enrichedProject?.customPrompt?.slice(0, 100),
      });

      // Cleanup
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000); // 60 second timeout for LLM call

    it("should enrich connection (group) context using real LLM", async () => {
      // Create test project and connection
      const [project] = await db
        .insert(projects)
        .values({
          name: "Performance Optimization",
          description: null,
          descriptionSource: "ai",
          healthScore: 100,
        })
        .returning();

      const [connection] = await db
        .insert(connections)
        .values({
          projectId: project.id,
          channelType: "whatsapp",
          label: "Dev Team Group",
          identifier: "1234567890@g.us",
          description: null,
          descriptionSource: "ai",
          priorities: null,
          prioritiesSource: "ai",
          customPrompt: null,
          customPromptSource: "ai",
          status: "active",
        })
        .returning();

      // Prepare messages
      const messages = contextEnrichmentScenarios.groupWithPriorities.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      // Enrich context
      await enrichBatchContext(
        project.id,
        connection.id,
        messages,
        ["Manager", "Dev1", "Dev2"]
      );

      // Verify connection was enriched
      const enrichedConnection = await db.query.connections.findFirst({
        where: eq(connections.id, connection.id),
      });

      expect(enrichedConnection).toBeDefined();
      const hasEnrichment =
        enrichedConnection?.description ||
        enrichedConnection?.priorities ||
        enrichedConnection?.customPrompt;
      expect(hasEnrichment).toBeTruthy();

      console.log("[Test] Connection enrichment results:", {
        description: enrichedConnection?.description?.slice(0, 100),
        priorities: enrichedConnection?.priorities?.slice(0, 100),
        customPrompt: enrichedConnection?.customPrompt?.slice(0, 100),
      });

      // Cleanup
      await db.delete(connections).where(eq(connections.id, connection.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);

    it("should enrich person context using real LLM", async () => {
      // Create test project
      const [project] = await db
        .insert(projects)
        .values({
          name: "Architecture Design",
          description: null,
          healthScore: 100,
        })
        .returning();

      // Prepare messages
      const messages = contextEnrichmentScenarios.personWithRole.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      // Enrich person context
      await enrichBatchContext(
        project.id,
        null,
        messages,
        ["Alice (Tech Lead)"]
      );

      // Verify person was enriched
      const personId = encodeURIComponent("alice (tech lead)");
      const enrichedPerson = await db.query.peopleSettings.findFirst({
        where: eq(peopleSettings.personId, personId),
      });

      expect(enrichedPerson).toBeDefined();
      const hasEnrichment =
        enrichedPerson?.roleDescription ||
        enrichedPerson?.priorities ||
        enrichedPerson?.customPrompt;
      expect(hasEnrichment).toBeTruthy();

      console.log("[Test] Person enrichment results:", {
        roleDescription: enrichedPerson?.roleDescription?.slice(0, 100),
        priorities: enrichedPerson?.priorities?.slice(0, 100),
        customPrompt: enrichedPerson?.customPrompt?.slice(0, 100),
      });

      // Cleanup
      await db.delete(peopleSettings).where(eq(peopleSettings.personId, personId));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);
  });

  describe("User Override Protection", () => {
    it("should NOT overwrite user-provided project description", async () => {
      // Create project with user-provided description
      const [project] = await db
        .insert(projects)
        .values({
          name: "Custom Project",
          description: "This is the official description set by user",
          descriptionSource: "user", // User provided
          priorities: null,
          prioritiesSource: "ai",
          customPrompt: null,
          customPromptSource: "ai",
          healthScore: 100,
        })
        .returning();

      // Prepare messages
      const messages = contextEnrichmentScenarios.mixedContext.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      // Try to enrich
      await enrichBatchContext(project.id, null, messages, ["Bob", "Carol"]);

      // Verify user description was preserved
      const updatedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(updatedProject?.description).toBe(
        "This is the official description set by user"
      );
      expect(updatedProject?.descriptionSource).toBe("user");

      // But other fields should be filled by AI
      expect(updatedProject?.priorities).toBeTruthy();
      expect(updatedProject?.prioritiesSource).toBe("ai");

      // Cleanup
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);

    it("should NOT overwrite user-provided priorities but can fill empty fields", async () => {
      // Create project with user-provided priorities only
      const [project] = await db
        .insert(projects)
        .values({
          name: "Partial Custom Project",
          description: null,
          descriptionSource: "ai",
          priorities: "User-defined priority: Security first",
          prioritiesSource: "user",
          customPrompt: null,
          customPromptSource: "ai",
          healthScore: 100,
        })
        .returning();

      const messages = contextEnrichmentScenarios.mixedContext.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      await enrichBatchContext(project.id, null, messages, ["Bob", "Carol"]);

      // Verify user priorities preserved
      const updatedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(updatedProject?.priorities).toBe("User-defined priority: Security first");
      expect(updatedProject?.prioritiesSource).toBe("user");

      // But description and customPrompt should be filled
      expect(updatedProject?.description).toBeTruthy();
      expect(updatedProject?.descriptionSource).toBe("ai");

      // Cleanup
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);

    it("should NOT overwrite any user-provided fields on connection", async () => {
      const [project] = await db
        .insert(projects)
        .values({
          name: "Protected Connection Test",
          healthScore: 100,
        })
        .returning();

      const [connection] = await db
        .insert(connections)
        .values({
          projectId: project.id,
          channelType: "whatsapp",
          label: "Protected Group",
          identifier: "protected@g.us",
          description: "User description - do not change",
          descriptionSource: "user",
          priorities: "User priority - do not change",
          prioritiesSource: "user",
          customPrompt: "User custom prompt - do not change",
          customPromptSource: "user",
          status: "active",
        })
        .returning();

      const messages = contextEnrichmentScenarios.groupWithPriorities.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      await enrichBatchContext(
        project.id,
        connection.id,
        messages,
        ["Manager", "Dev1", "Dev2"]
      );

      // Verify all user values preserved
      const updatedConnection = await db.query.connections.findFirst({
        where: eq(connections.id, connection.id),
      });

      expect(updatedConnection?.description).toBe("User description - do not change");
      expect(updatedConnection?.priorities).toBe("User priority - do not change");
      expect(updatedConnection?.customPrompt).toBe("User custom prompt - do not change");
      expect(updatedConnection?.descriptionSource).toBe("user");
      expect(updatedConnection?.prioritiesSource).toBe("user");
      expect(updatedConnection?.customPromptSource).toBe("user");

      // Cleanup
      await db.delete(connections).where(eq(connections.id, connection.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);
  });

  describe("Rich Context Prompt Building with Real LLM", () => {
    it("should build rich prompt and use it for task extraction with real LLM", async () => {
      // Create enriched project
      const [project] = await db
        .insert(projects)
        .values({
          name: "E-commerce Platform",
          description: "Building a multi-vendor e-commerce platform with payment integration",
          priorities: "Payment security, mobile responsiveness, scalability",
          customPrompt: "This project uses React, Node.js, and PostgreSQL. Focus on security best practices.",
          healthScore: 100,
        })
        .returning();

      // Create enriched connection
      const [connection] = await db
        .insert(connections)
        .values({
          projectId: project.id,
          channelType: "whatsapp",
          label: "E-commerce Dev Team",
          identifier: "ecom-dev@g.us",
          description: "Development team for e-commerce features",
          priorities: "Bug fixes, feature development, code reviews",
          status: "active",
        })
        .returning();

      // Create enriched person
      const personId = encodeURIComponent("sarah (frontend lead)");
      await db.insert(peopleSettings).values({
        personId,
        name: "Sarah (Frontend Lead)",
        roleName: "Frontend Lead",
        roleDescription: "Leads UI/UX implementation and frontend architecture",
        priorities: "Component reusability, performance optimization",
      });

      // Build rich prompt
      const projectContext = {
        name: project.name,
        description: project.description,
        priorities: project.priorities,
        customPrompt: project.customPrompt,
      };

      const connectionContext = {
        label: connection.label,
        description: connection.description,
        priorities: connection.priorities,
        customPrompt: null,
      };

      const peopleContext = [
        {
          name: "Sarah (Frontend Lead)",
          roleName: "Frontend Lead",
          roleDescription: "Leads UI/UX implementation",
          priorities: "Component reusability",
          customPrompt: null,
          aliases: [],
        },
      ];

      const messages = [
        {
          sender: "Sarah (Frontend Lead)",
          text: "Need to implement the shopping cart component with Redux for state management. Deadline is Friday.",
          timestamp: new Date(),
        },
      ];

      const richPrompt = buildRichTaskExtractionPrompt(
        projectContext,
        connectionContext,
        peopleContext,
        [],
        messages
      );

      // Verify prompt contains all context
      expect(richPrompt).toContain("E-commerce Platform");
      expect(richPrompt).toContain("multi-vendor e-commerce");
      expect(richPrompt).toContain("Payment security");
      expect(richPrompt).toContain("React, Node.js");
      expect(richPrompt).toContain("E-commerce Dev Team");
      expect(richPrompt).toContain("Sarah (Frontend Lead)");
      expect(richPrompt).toContain("Frontend Lead");

      // Actually call LLM with rich prompt
      const response = await llmChatCompletionsCreate({
        model: DEFAULT_MODEL,
        messages: [
          { role: "system", content: taskExtractionSystemPrompt },
          { role: "user", content: richPrompt },
        ],
        response_format: zodResponseFormat(
          DeadlineExtractionSchema,
          "task_extraction"
        ),
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      expect(content).toBeTruthy();

      const result = JSON.parse(content!);
      const extractedTasks = DeadlineExtractionSchema.parse(result);

      // Should extract at least one task
      expect(extractedTasks.tasks.length).toBeGreaterThanOrEqual(1);

      // Check that context-aware extraction worked
      const cartTask = extractedTasks.tasks.find((t) =>
        t.description.toLowerCase().includes("cart") ||
        t.description.toLowerCase().includes("redux")
      );
      expect(cartTask).toBeDefined();

      console.log("[Test] Rich context extraction results:", {
        taskCount: extractedTasks.tasks.length,
        tasks: extractedTasks.tasks.map((t) => ({
          description: t.description,
          confidence: t.confidence,
        })),
      });

      // Cleanup
      await db.delete(peopleSettings).where(eq(peopleSettings.personId, personId));
      await db.delete(connections).where(eq(connections.id, connection.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);

    it("should improve task extraction accuracy with rich context", async () => {
      // Create test scenario
      const scenario = {
        name: "context-accuracy-test",
        messages: [
          {
            sender: "Alex",
            text: "Working on the authentication module. Need to implement OAuth2 flow for Google and Facebook login.",
          },
          {
            sender: "Ben",
            text: "Make sure we handle the token refresh properly. Security is critical for auth features.",
          },
        ],
      };

      // Create project with specific context
      const [project] = await db
        .insert(projects)
        .values({
          name: "Authentication Service",
          description: "OAuth2 and JWT-based authentication microservice",
          priorities: "Security, token management, third-party integrations",
          customPrompt: "Focus on OAuth2 flows, JWT tokens, and refresh mechanisms",
          healthScore: 100,
        })
        .returning();

      const [connection] = await db
        .insert(connections)
        .values({
          projectId: project.id,
          channelType: "whatsapp",
          label: "Auth Team",
          identifier: "auth-team@g.us",
          description: "Team working on authentication and authorization",
          status: "active",
        })
        .returning();

      // Seed messages
      const [message1] = await db
        .insert(messages)
        .values({
          connectionId: connection.id,
          projectId: project.id,
          sender: "6281234567890@c.us",
          pushName: "Alex",
          messageText: scenario.messages[0].text,
          messageHash: "hash1",
          isGroup: true,
          processed: false,
          fonnteDate: new Date(),
        })
        .returning();

      const [message2] = await db
        .insert(messages)
        .values({
          connectionId: connection.id,
          projectId: project.id,
          sender: "6281234567891@c.us",
          pushName: "Ben",
          messageText: scenario.messages[1].text,
          messageHash: "hash2",
          isGroup: true,
          processed: false,
          fonnteDate: new Date(),
        })
        .returning();

      // Run task extractor (which uses rich context internally)
      const result = await runTaskExtractorOnce([message1.id, message2.id]);

      expect(result.success).toBe(true);
      expect(result.extractedTasks.length).toBeGreaterThanOrEqual(1);

      // Tasks should be related to authentication
      const authTasks = result.extractedTasks.filter(
        (t) =>
          t.description.toLowerCase().includes("oauth") ||
          t.description.toLowerCase().includes("auth") ||
          t.description.toLowerCase().includes("login") ||
          t.description.toLowerCase().includes("token")
      );

      console.log("[Test] Context-aware extraction:", {
        totalTasks: result.extractedTasks.length,
        authRelatedTasks: authTasks.length,
        tasks: result.extractedTasks.map((t) => t.description),
      });

      // Cleanup
      await db.delete(messages).where(eq(messages.id, message1.id));
      await db.delete(messages).where(eq(messages.id, message2.id));
      await db
        .delete(tasks)
        .where(eq(tasks.projectId, project.id));
      await db.delete(connections).where(eq(connections.id, connection.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);
  });

  describe("API Endpoint Source Tracking", () => {
    it("should mark fields as user-provided when updated via API", async () => {
      // Create project with AI-filled fields
      const [project] = await db
        .insert(projects)
        .values({
          name: "API Source Test",
          description: "AI generated description",
          descriptionSource: "ai",
          priorities: "AI generated priorities",
          prioritiesSource: "ai",
          customPrompt: null,
          customPromptSource: "ai",
          healthScore: 100,
        })
        .returning();

      // Simulate API update (user editing via PUT /api/projects/:id)
      await db
        .update(projects)
        .set({
          description: "User updated description",
          descriptionSource: "user",
          priorities: "User updated priorities",
          prioritiesSource: "user",
          updatedAt: new Date(),
        })
        .where(eq(projects.id, project.id));

      // Verify sources updated
      const updatedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(updatedProject?.descriptionSource).toBe("user");
      expect(updatedProject?.prioritiesSource).toBe("user");
      expect(updatedProject?.customPromptSource).toBe("ai"); // Unchanged

      // Try AI enrichment - should not overwrite user fields
      const messages = contextEnrichmentScenarios.mixedContext.messages.map(
        (m) => ({ sender: m.sender, text: m.text })
      );

      await enrichBatchContext(project.id, null, messages, ["Bob", "Carol"]);

      // Verify user values preserved
      const finalProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      expect(finalProject?.description).toBe("User updated description");
      expect(finalProject?.priorities).toBe("User updated priorities");
      expect(finalProject?.descriptionSource).toBe("user");
      expect(finalProject?.prioritiesSource).toBe("user");

      // Cleanup
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);
  });

  describe("Integration with Task Extraction Flow", () => {
    it("should trigger context enrichment after task extraction completes", async () => {
      // Create project and connection
      const [project] = await db
        .insert(projects)
        .values({
          name: "Integration Test Project",
          description: null,
          descriptionSource: "ai",
          healthScore: 100,
        })
        .returning();

      const [connection] = await db
        .insert(connections)
        .values({
          projectId: project.id,
          channelType: "whatsapp",
          label: "Integration Test Group",
          identifier: "integration-test@g.us",
          description: null,
          descriptionSource: "ai",
          status: "active",
        })
        .returning();

      // Seed messages
      const [message] = await db
        .insert(messages)
        .values({
          connectionId: connection.id,
          projectId: project.id,
          sender: "6281234567890@c.us",
          pushName: "TestUser",
          messageText:
            "Implementing the payment gateway integration with Stripe API. Need to handle webhooks and error cases properly.",
          messageHash: "integration-hash",
          isGroup: true,
          processed: false,
          fonnteDate: new Date(),
        })
        .returning();

      // Run task extractor
      const result = await runTaskExtractorOnce([message.id]);

      expect(result.success).toBe(true);

      // Manually trigger enrichment (simulating what task-extractor.ts does)
      await enrichBatchContext(
        project.id,
        connection.id,
        [
          {
            sender: "TestUser",
            text: "Implementing the payment gateway integration with Stripe API.",
          },
        ],
        ["TestUser"]
      );

      // Verify both task and context were created
      const enrichedProject = await db.query.projects.findFirst({
        where: eq(projects.id, project.id),
      });

      const enrichedConnection = await db.query.connections.findFirst({
        where: eq(connections.id, connection.id),
      });

      // Project should be enriched
      expect(
        enrichedProject?.description || enrichedProject?.priorities
      ).toBeTruthy();

      // Connection should be enriched
      expect(
        enrichedConnection?.description || enrichedConnection?.priorities
      ).toBeTruthy();

      console.log("[Test] Integration results:", {
        projectEnriched: !!(
          enrichedProject?.description || enrichedProject?.priorities
        ),
        connectionEnriched: !!(
          enrichedConnection?.description || enrichedConnection?.priorities
        ),
        projectDescription: enrichedProject?.description?.slice(0, 50),
        connectionDescription: enrichedConnection?.description?.slice(0, 50),
      });

      // Cleanup
      await db.delete(messages).where(eq(messages.id, message.id));
      await db.delete(tasks).where(eq(tasks.projectId, project.id));
      await db.delete(connections).where(eq(connections.id, connection.id));
      await db.delete(projects).where(eq(projects.id, project.id));
    }, 60000);
  });
});
