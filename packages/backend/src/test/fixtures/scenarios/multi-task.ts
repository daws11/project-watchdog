import type { TestScenario } from "../../utils/seed-messages";

/**
 * Multiple tasks in one message
 * Tests extraction of multiple tasks from a single message
 */
export const multiTaskScenario: TestScenario = {
  name: "multi-task",
  projectName: "Q1 Marketing Campaign",
  projectDescription: "First quarter digital marketing campaign for product launch",
  groupId: "test-marketing-q1@g.us",
  messages: [
    {
      sender: "6289876543210@c.us",
      pushName: "Marketing Lead",
      text: `Tugas minggu ini:
1. Desain banner promo untuk social media (Ahmad)
2. Setup Facebook ads campaign (Budi)
3. Write email newsletter untuk subscriber (Citra) - deadline Jumat
4. Review analytics report dari minggu lalu`,
      offsetMinutes: 5,
    },
  ],
  expectedTaskPatterns: ["banner", "Facebook", "newsletter", "analytics"],
};

/**
 * Expected extraction results for validation
 */
export const multiTaskExpected = {
  taskCount: 4,
  tasks: [
    {
      descriptionPattern: "banner|promo|social media",
      assignee: "Ahmad",
      minConfidence: 0.7,
    },
    {
      descriptionPattern: "Facebook ads|campaign",
      assignee: "Budi",
      minConfidence: 0.7,
    },
    {
      descriptionPattern: "newsletter|email",
      assignee: "Citra",
      deadlinePattern: "Jumat|Friday",
      minConfidence: 0.7,
    },
    {
      descriptionPattern: "analytics|report",
      assignee: null,
      minConfidence: 0.6,
    },
  ],
};
