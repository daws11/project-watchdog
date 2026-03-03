import type { TestScenario } from "../../utils/seed-messages";

/**
 * Mixed language scenario (Indonesian + English)
 * Tests task extraction from mixed language messages
 */
export const mixedLanguageScenario: TestScenario = {
  name: "mixed-language",
  projectName: "API Gateway Development",
  projectDescription: "Microservices API gateway with authentication and rate limiting",
  groupId: "test-api-gateway@g.us",
  messages: [
    {
      sender: "62877776666@c.us",
      pushName: "Senior Developer",
      text: "Please review PR #42 sebelum kita merge ke main branch ya @dev-team",
      offsetMinutes: 20,
    },
    {
      sender: "62888889999@c.us",
      pushName: "Tech Lead",
      text: "Jangan lupa juga untuk implement rate limiting di endpoint yang public",
      offsetMinutes: 15,
    },
    {
      sender: "62855554444@c.us",
      pushName: "Backend Dev",
      text: "I'll handle the rate limiting. ETA end of day tomorrow.",
      offsetMinutes: 10,
    },
    {
      sender: "62833332222@c.us",
      pushName: "DevOps",
      text: "Saya setup monitoring dan alerting untuk API gateway nya, should be done by Friday",
      offsetMinutes: 5,
    },
  ],
  expectedTaskPatterns: ["review PR", "rate limiting", "monitoring"],
};

/**
 * Expected extraction results for validation
 */
export const mixedLanguageExpected = {
  taskCount: 3,
  tasks: [
    {
      descriptionPattern: "review.*PR|PR.*review",
      assignee: "dev-team",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "rate limiting",
      assignee: "Backend Dev",
      deadlinePattern: "tomorrow|besok",
      minConfidence: 0.8,
    },
    {
      descriptionPattern: "monitoring|alerting",
      assignee: "DevOps",
      deadlinePattern: "Friday|Jumat",
      minConfidence: 0.8,
    },
  ],
};
