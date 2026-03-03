import type { TestScenario } from "../../utils/seed-messages";

/**
 * Simple assignment scenario with @mention
 * Tests basic task extraction with assignee detection
 */
export const simpleAssignmentScenario: TestScenario = {
  name: "simple-assignment",
  projectName: "Website Development",
  projectDescription: "Building company website with React and Node.js",
  groupId: "test-web-dev@g.us",
  messages: [
    {
      sender: "6281234567890@c.us",
      pushName: "Project Manager",
      text: "@Ahmad tolong buatkan halaman about us ya, deadline besok jam 5 sore",
      offsetMinutes: 10,
    },
  ],
  expectedTaskPatterns: ["about us", "halaman"],
};

/**
 * Expected extraction results for validation
 */
export const simpleAssignmentExpected = {
  taskCount: 1,
  tasks: [
    {
      descriptionPattern: "about us|halaman about",
      assignee: "Ahmad",
      deadlinePattern: "besok|tomorrow",
      minConfidence: 0.8,
    },
  ],
};
