import type { TestScenario } from "../../utils/seed-messages";

/**
 * Off-topic scenario
 * Tests that casual conversation is not extracted as tasks
 */
export const offTopicScenario: TestScenario = {
  name: "off-topic",
  projectName: "Enterprise CRM System",
  projectDescription: "Customer relationship management system for enterprise clients",
  groupId: "test-enterprise-crm@g.us",
  messages: [
    {
      sender: "62899998888@c.us",
      pushName: "Random User",
      text: "Guys, makan siang di mana hari ini? Ada yang mau ke foodcourt?",
      offsetMinutes: 15,
    },
    {
      sender: "62877776666@c.us",
      pushName: "Team Member",
      text: "Aku prefer di kantin aja, lebih dekat",
      offsetMinutes: 12,
    },
    {
      sender: "62844445555@c.us",
      pushName: "Another Member",
      text: "Setuju, kantin aja. Jam 12 ya?",
      offsetMinutes: 10,
    },
    {
      sender: "6281234567890@c.us",
      pushName: "Project Manager",
      text: "Ok, tapi jangan lupa setelah makan kita lanjut review PR yang pending ya",
      offsetMinutes: 8,
    },
  ],
  expectedTaskPatterns: ["review PR"],
};

/**
 * Expected extraction results for validation
 * Note: Only the last message about PR review should be extracted
 * Lunch conversation should have low confidence or not extracted
 */
export const offTopicExpected = {
  taskCount: 1,
  tasks: [
    {
      descriptionPattern: "review|PR",
      minConfidence: 0.7,
    },
  ],
};
