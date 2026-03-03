import type { TestScenario } from "../../utils/seed-messages";

/**
 * Deadline extraction scenario
 * Tests parsing of deadlines in various formats
 */
export const deadlineExtractionScenario: TestScenario = {
  name: "deadline-extraction",
  projectName: "Product Launch Q2",
  projectDescription: "New product line launch for second quarter 2024",
  groupId: "test-product-launch@g.us",
  messages: [
    {
      sender: "62811110000@c.us",
      pushName: "Project Manager",
      text: "@tim tolong finalisasi marketing materials, deadline besok jam 5 sore",
      offsetMinutes: 30,
    },
    {
      sender: "62822221111@c.us",
      pushName: "Content Lead",
      text: "Review website copy harus selesai before Friday EOD ya",
      offsetMinutes: 25,
    },
    {
      sender: "62833332222@c.us",
      pushName: "Design Lead",
      text: "Asset desain akan saya kirim Senin depan, latest by Tuesday morning",
      offsetMinutes: 20,
    },
    {
      sender: "62844443333@c.us",
      pushName: "Dev Lead",
      text: "Feature freeze untuk launch ini tanggal 15 Maret, no exceptions",
      offsetMinutes: 15,
    },
    {
      sender: "62855554444@c.us",
      pushName: "QA Manager",
      text: "Testing harus complete 3 hari sebelum launch date",
      offsetMinutes: 10,
    },
  ],
  expectedTaskPatterns: ["marketing", "website copy", "asset desain", "feature freeze", "testing"],
};

/**
 * Expected extraction results for validation
 */
export const deadlineExtractionExpected = {
  taskCount: 5,
  tasks: [
    {
      descriptionPattern: "marketing|materials",
      deadlinePattern: "besok|tomorrow",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "website|copy",
      deadlinePattern: "Friday",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "desain|asset|design",
      deadlinePattern: "Senin|Monday|Tuesday",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "feature freeze",
      deadlinePattern: "15 Maret|March",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "testing|QA",
      deadlinePattern: "3 hari|3 days",
      minConfidence: 0.7,
    },
  ],
};
