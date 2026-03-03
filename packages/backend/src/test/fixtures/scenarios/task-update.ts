import type { TestScenario } from "../../utils/seed-messages";

/**
 * Scenario untuk testing task update dan deduplication
 * Task sudah ada dan pesan baru memberikan informasi tambahan (deadline)
 */
export const taskUpdateScenario: TestScenario = {
  name: "task-update",
  projectName: "E-commerce Platform",
  projectDescription: "Building e-commerce platform with payment integration",
  groupId: "test-ecommerce@g.us",
  existingTasks: [
    "Setup payment gateway integration",
    "Design product catalog page",
  ],
  messages: [
    {
      sender: "62811112222@c.us",
      pushName: "Backend Developer",
      text: "Payment gateway integration harus selesai besok jam 5 sore ya @backend-team, deadline ketat ini",
      offsetMinutes: 5,
    },
    {
      sender: "62833334444@c.us",
      pushName: "Tech Lead",
      text: "Oke noted, saya assign ke @john untuk handle payment gatewaynya",
      offsetMinutes: 3,
    },
  ],
  expectedTaskPatterns: ["payment gateway"],
  // Expectation: Task "Setup payment gateway integration" should be updated with deadline and assignee
  // Bukan membuat task baru
};

/**
 * Expected results untuk task update scenario
 */
export const taskUpdateExpected = {
  taskCount: 0, // No new tasks should be created (existing task updated)
  updatedTasks: [
    {
      taskId: 1, // First existing task
      descriptionPattern: "payment gateway",
      expectedUpdates: ["deadline", "owner"],
    },
  ],
  minConfidence: 0.7,
};
