import type { TestScenario } from "../../utils/seed-messages";

/**
 * Scenario with existing tasks for context deduplication testing
 * Tests that similar tasks are not duplicated
 */
export const withExistingTasksScenario: TestScenario = {
  name: "with-existing-tasks",
  projectName: "Mobile App Development",
  projectDescription: "iOS and Android app for inventory management system",
  groupId: "test-mobile-app@g.us",
  existingTasks: [
    "Implement user login authentication with email and password",
    "Create database schema for products table",
    "Setup push notification service",
  ],
  messages: [
    {
      sender: "62811112222@c.us",
      pushName: "Tech Lead",
      text: "Jangan lupa user login authentication harus support OAuth juga ya, jangan cuma email password",
      offsetMinutes: 10,
    },
    {
      sender: "62833334444@c.us",
      pushName: "Developer",
      text: "Ok noted, saya tambahkan OAuth integration ke task yang sudah ada",
      offsetMinutes: 5,
    },
    {
      sender: "62855556666@c.us",
      pushName: "Product Owner",
      text: "Tim, kita perlu buat fitur barcode scanner juga. Ini task baru yang urgent.",
      offsetMinutes: 2,
    },
  ],
  expectedTaskPatterns: ["barcode scanner"],
};

/**
 * Expected extraction results for validation
 * Note: Should only extract barcode scanner as new task
 * Login authentication should not be duplicated
 */
export const withExistingTasksExpected = {
  taskCount: 1,
  tasks: [
    {
      descriptionPattern: "barcode|scanner",
      assignee: null,
      minConfidence: 0.8,
    },
  ],
};
