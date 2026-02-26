import { Router } from "express";

const router = Router();

// Returns dashboard summary data.
// In a full implementation this would aggregate from the database;
// for now we serve realistic sample data so the frontend is fully wired.
router.get("/", (_req, res) => {
  const now = Date.now();

  res.json({
    kpis: [
      {
        id: "high-priority",
        label: "High Priority",
        value: 12,
        trend: "+3",
        trendDirection: "up",
        color: "amber",
        linkTo: "/tasks",
        linkFilter: "priority=high",
      },
      {
        id: "medium-priority",
        label: "Medium Priority",
        value: 28,
        trend: "-2",
        trendDirection: "down",
        color: "default",
        linkTo: "/tasks",
        linkFilter: "priority=medium",
      },
      {
        id: "low-priority",
        label: "Low Priority",
        value: 15,
        trend: "0",
        trendDirection: "neutral",
        color: "default",
        linkTo: "/tasks",
        linkFilter: "priority=low",
      },
      {
        id: "problems",
        label: "Problems",
        value: 7,
        trend: "+2",
        trendDirection: "up",
        color: "red",
        linkTo: "/tasks",
        linkFilter: "status=problem",
      },
    ],
    goalAlignment: {
      onGoal: 14,
      offGoal: 4,
      total: 18,
      linkTo: "/people",
      linkFilterOnGoal: "goal=on",
      linkFilterOffGoal: "goal=off",
    },
    attentionPeople: [
      {
        personId: "u-001",
        name: "James Okonkwo",
        role: "Operations Lead",
        goalStatus: "off",
        misalignedGoal: "Reduce supplier response time to under 24h",
        taskCount: 8,
        goalMatchCount: 1,
      },
      {
        personId: "u-004",
        name: "Priya Nair",
        role: "Finance Controller",
        goalStatus: "off",
        misalignedGoal:
          "Close monthly reconciliation within 5 business days",
        taskCount: 6,
        goalMatchCount: 0,
      },
      {
        personId: "u-007",
        name: "Carlos Mendes",
        role: "Logistics Coordinator",
        goalStatus: "off",
        misalignedGoal: "Maintain zero shipment delays for Q1",
        taskCount: 4,
        goalMatchCount: 1,
      },
      {
        personId: "u-011",
        name: "Fatima Al-Rashid",
        role: "Client Relations Manager",
        goalStatus: "off",
        misalignedGoal:
          "Respond to all client escalations within 4 hours",
        taskCount: 5,
        goalMatchCount: 0,
      },
    ],
    activityFeed: [
      {
        id: "evt-001",
        type: "processing",
        description:
          "Processing run completed — 23 tasks extracted from 142 messages",
        timestamp: new Date(now - 30 * 60_000).toISOString(), // 30m ago
        linkTo: "/processing",
      },
      {
        id: "evt-002",
        type: "task",
        description:
          "New high-priority task detected for Sarah Chen: Review vendor contract terms",
        timestamp: new Date(now - 2 * 3600_000).toISOString(), // 2h ago
        linkTo: "/tasks",
      },
      {
        id: "evt-003",
        type: "problem",
        description:
          "Identity conflict flagged — 2 phone numbers mapped to different users",
        timestamp: new Date(now - 18 * 3600_000).toISOString(), // 18h ago
        linkTo: "/people",
      },
      {
        id: "evt-004",
        type: "source",
        description:
          "New source added: Marketing WhatsApp Group (347 messages imported)",
        timestamp: new Date(now - 26 * 3600_000).toISOString(), // ~1d ago
        linkTo: "/sources",
      },
      {
        id: "evt-005",
        type: "identity",
        description:
          "3 identity conflicts resolved automatically during processing",
        timestamp: new Date(now - 2 * 86_400_000).toISOString(), // 2d ago
        linkTo: "/people",
      },
      {
        id: "evt-006",
        type: "task",
        description:
          "2 tasks marked overdue: delivery schedule review, budget sign-off",
        timestamp: new Date(now - 3 * 86_400_000).toISOString(), // 3d ago
        linkTo: "/tasks",
      },
      {
        id: "evt-007",
        type: "processing",
        description:
          "Scheduled processing run started — scanning 3 sources",
        timestamp: new Date(now - 4 * 86_400_000).toISOString(), // 4d ago
        linkTo: "/processing",
      },
    ],
  });
});

export { router as dashboardRouter };
